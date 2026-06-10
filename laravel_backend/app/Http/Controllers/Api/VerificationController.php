<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\OTP;
use App\Mail\OTPMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;

class VerificationController extends BaseApiController
{
    /**
     * Send OTP for email verification (public endpoint)
     */
    public function sendOTP(Request $request)
    {
        try {
            $request->validate(['email' => 'required|email|exists:users,email']);
            $user = User::where('email', $request->email)->firstOrFail();

            if ($user->email_verified_at) {
                return $this->badRequest('Email already verified');
            }

            // Delete old OTPs for this email
            OTP::where('email', $request->email)
                ->whereIn('type', [OTP::TYPE_REGISTRATION, OTP::TYPE_EMAIL_VERIFICATION])
                ->delete();

            $otpRecord = OTP::create([
                'id'         => (string) Str::uuid(),
                'email'      => $user->email,
                'type'       => OTP::TYPE_EMAIL_VERIFICATION,
                'name'       => $user->name,
                'expires_at' => Carbon::now()->addMinutes(10),
            ]);

            Mail::to($user->email)->send(
                new OTPMail($otpRecord->otp, $user->name, 'verification', $otpRecord->getVerificationUrl())
            );

            return $this->successResponse(['email' => $user->email], 'OTP sent');
        } catch (\Exception $e) {
            Log::error('Send OTP failed: ' . $e->getMessage());
            return $this->serverError('Failed to send OTP');
        }
    }

    /**
     * Verify email using OTP (public endpoint)
     */
    public function verifyWithOTP(Request $request)
    {
        try {
            $request->validate(['email' => 'required|email', 'otp' => 'required|string|size:6']);
            $otpRecord = OTP::where('email', $request->email)
                ->where('otp', $request->otp)
                ->whereIn('type', [OTP::TYPE_REGISTRATION, OTP::TYPE_EMAIL_VERIFICATION])
                ->where('is_used', false)
                ->where('expires_at', '>', Carbon::now())
                ->first();

            if (!$otpRecord) {
                return $this->badRequest('Invalid or expired OTP');
            }

            DB::beginTransaction();
            $user = User::where('email', $request->email)->firstOrFail();
            $user->update(['email_verified_at' => now(), 'status' => 'active', 'is_active' => true]);
            $otpRecord->markAsUsed();
            DB::commit();

            return $this->successResponse(['user' => $user->only(['id', 'name', 'email'])], 'Email verified');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('OTP verification failed: ' . $e->getMessage());
            return $this->serverError('Verification failed');
        }
    }

    /**
     * Verify email using token link (public endpoint)
     */
    public function verifyByToken(Request $request)
    {
        try {
            $request->validate(['token' => 'required|string', 'email' => 'required|email']);
            $otpRecord = OTP::where('token', $request->token)
                ->where('email', $request->email)
                ->whereIn('type', [OTP::TYPE_REGISTRATION, OTP::TYPE_EMAIL_VERIFICATION])
                ->where('is_used', false)
                ->where('expires_at', '>', Carbon::now())
                ->first();

            if (!$otpRecord) {
                return $this->badRequest('Invalid or expired link');
            }

            DB::beginTransaction();
            $user = User::where('email', $request->email)->firstOrFail();
            $user->update(['email_verified_at' => now(), 'status' => 'active', 'is_active' => true]);
            $otpRecord->markAsUsed();
            DB::commit();

            return $this->successResponse(['user' => $user->only(['id', 'name', 'email'])], 'Email verified');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Token verification failed: ' . $e->getMessage());
            return $this->serverError('Verification failed');
        }
    }

    /**
     * Resend OTP (public endpoint with rate limiting)
     */
    public function resendOTP(Request $request)
    {
        try {
            $request->validate(['email' => 'required|email']);
            $user = User::where('email', $request->email)->first();
            if (!$user) {
                return $this->notFound('User not found');
            }
            if ($user->email_verified_at) {
                return $this->badRequest('Already verified');
            }

            $lastOtp = OTP::where('email', $request->email)
                ->whereIn('type', [OTP::TYPE_REGISTRATION, OTP::TYPE_EMAIL_VERIFICATION])
                ->latest()->first();

            if ($lastOtp && $lastOtp->created_at->diffInSeconds(now()) < 60) {
                return $this->tooManyRequests('Please wait 60 seconds');
            }

            OTP::where('email', $request->email)
                ->whereIn('type', [OTP::TYPE_REGISTRATION, OTP::TYPE_EMAIL_VERIFICATION])
                ->delete();

            $otpRecord = OTP::create([
                'id'    => (string) Str::uuid(),
                'email' => $user->email,
                'type'  => OTP::TYPE_EMAIL_VERIFICATION,
                'name'  => $user->name,
            ]);

            Mail::to($user->email)->send(
                new OTPMail($otpRecord->otp, $user->name, 'verification', $otpRecord->getVerificationUrl())
            );

            return $this->successResponse(null, 'New OTP sent');
        } catch (\Exception $e) {
            Log::error('Resend OTP failed: ' . $e->getMessage());
            return $this->serverError('Failed to resend OTP');
        }
    }

    /**
     * Check verification status (public endpoint)
     */
    public function checkStatus(Request $request)
    {
        try {
            $request->validate(['email' => 'required|email']);
            $user = User::where('email', $request->email)->first();
            if (!$user) {
                return $this->notFound('User not found');
            }

            return $this->successResponse([
                'email'           => $user->email,
                'is_verified'     => !is_null($user->email_verified_at),
                'verified_at'     => $user->email_verified_at?->format('Y-m-d H:i:s'),
                'account_status'  => $user->status,
            ], 'Status retrieved');
        } catch (\Exception $e) {
            Log::error('Check status failed: ' . $e->getMessage());
            return $this->serverError('Failed to check status');
        }
    }
}