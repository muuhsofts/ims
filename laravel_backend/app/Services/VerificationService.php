<?php

namespace App\Services;

use App\Models\User;
use App\Models\OTP;
use App\Mail\OTPMail;
use App\Mail\VerificationSuccessMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class VerificationService
{
    /**
     * Send OTP for verification to user/agent
     */
    public function sendVerificationOTP(User $user, string $type = OTP::TYPE_REGISTRATION): array
    {
        // Delete old OTPs
        OTP::where('email', $user->email)
            ->where('type', $type)
            ->delete();

        // Create new OTP
        $otp = OTP::create([
            'email' => $user->email,
            'type' => $type,
            'name' => $user->name,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        // Send email with OTP only (no verification link)
        Mail::to($user->email)->send(
            new OTPMail($otp->otp, $user->name, 'verification')
        );

        return [
            'email' => $user->email,
            'otp_sent' => true,
            'expires_in' => 10,
            'remaining_attempts' => 3,
        ];
    }

    /**
     * Send password reset OTP
     */
    public function sendPasswordResetOTP(User $user): array
    {
        // Delete old reset OTPs
        OTP::where('email', $user->email)
            ->where('type', OTP::TYPE_PASSWORD_RESET)
            ->delete();

        // Create new OTP
        $otp = OTP::create([
            'email' => $user->email,
            'type' => OTP::TYPE_PASSWORD_RESET,
            'name' => $user->name,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        // Send email with OTP only
        Mail::to($user->email)->send(
            new OTPMail($otp->otp, $user->name, 'reset')
        );

        return [
            'email' => $user->email,
            'otp_sent' => true,
            'expires_in' => 10,
            'remaining_attempts' => 3,
        ];
    }

    /**
     * Verify user by OTP
     */
    public function verifyWithOTP(string $email, string $otp, string $type = OTP::TYPE_REGISTRATION): array
    {
        DB::beginTransaction();

        try {
            $otpRecord = OTP::where('email', $email)
                ->where('otp', $otp)
                ->where('type', $type)
                ->first();

            if (!$otpRecord) {
                throw new \Exception('Invalid OTP code.');
            }

            if (!$otpRecord->isValid()) {
                if ($otpRecord->is_used) {
                    throw new \Exception('This OTP has already been used.');
                }
                if ($otpRecord->expires_at && Carbon::now()->gt($otpRecord->expires_at)) {
                    throw new \Exception('OTP has expired. Please request a new one.');
                }
                if ($otpRecord->attempts >= 3) {
                    throw new \Exception('Too many failed attempts. Please request a new OTP.');
                }
                throw new \Exception('Invalid or expired OTP.');
            }

            $otpRecord->markAsUsed();

            $user = User::where('email', $email)->firstOrFail();
            
            // If it's registration/verification, verify the user
            if ($type === OTP::TYPE_REGISTRATION) {
                $this->verifyUserById($user->id);
            }

            DB::commit();

            return [
                'verified' => true,
                'user_id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'status' => $user->status,
                'role' => $user->role ? $user->role->name : null,
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            if (isset($otpRecord) && $otpRecord) {
                $otpRecord->incrementAttempts();
            }
            throw new \Exception($e->getMessage());
        }
    }

    /**
     * Verify user by ID
     */
    public function verifyUserById(string $userId): array
    {
        $user = User::findOrFail($userId);

        if (!is_null($user->email_verified_at) && $user->status === 'active') {
            return [
                'verified' => true,
                'message' => 'User is already verified and active.',
                'user_id' => $user->id,
                'email' => $user->email,
                'status' => $user->status,
            ];
        }

        $user->update([
            'email_verified_at' => Carbon::now(),
            'status' => 'active',
            'is_active' => true,
        ]);

        // Send verification success email
        Mail::to($user->email)->send(new VerificationSuccessMail($user));

        return [
            'verified' => true,
            'message' => 'User verified and activated successfully.',
            'user_id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'status' => $user->status,
            'role' => $user->role ? $user->role->name : null,
        ];
    }

    /**
     * Verify agent by ID
     */
    public function verifyAgentById(string $agentId): array
    {
        $agent = User::findOrFail($agentId);

        if (!$agent->role || $agent->role->name !== 'SALES_AGENT') {
            throw new \Exception('User is not a sales agent.');
        }

        if (!is_null($agent->email_verified_at) && $agent->status === 'active') {
            return [
                'verified' => true,
                'message' => 'Agent is already verified and active.',
                'agent_id' => $agent->id,
                'email' => $agent->email,
                'status' => $agent->status,
            ];
        }

        $agent->update([
            'email_verified_at' => Carbon::now(),
            'status' => 'active',
            'is_active' => true,
        ]);

        // Send verification success email
        Mail::to($agent->email)->send(new VerificationSuccessMail($agent));

        return [
            'verified' => true,
            'message' => 'Agent verified and activated successfully.',
            'agent_id' => $agent->id,
            'email' => $agent->email,
            'name' => $agent->name,
            'status' => $agent->status,
            'collection_center' => $agent->collectionCenter ? $agent->collectionCenter->cc_name : null,
        ];
    }

    /**
     * Resend OTP
     */
    public function resendOTP(string $email, string $type = OTP::TYPE_REGISTRATION): array
    {
        $user = User::where('email', $email)->firstOrFail();

        if (!is_null($user->email_verified_at)) {
            throw new \Exception('Email is already verified.');
        }

        return $this->sendVerificationOTP($user, $type);
    }

    /**
     * Check verification status
     */
    public function checkVerificationStatus(string $userId): array
    {
        $user = User::findOrFail($userId);

        return [
            'user_id' => $user->id,
            'email' => $user->email,
            'is_verified' => !is_null($user->email_verified_at),
            'verified_at' => $user->email_verified_at,
            'status' => $user->status,
            'is_active' => $user->is_active,
            'role' => $user->role ? $user->role->name : null,
        ];
    }
}