<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\OTP;
use App\Models\User;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Mail\OTPMail;
use Illuminate\Support\Facades\Mail;


class VerificationWebController extends Controller
{
    public function verifyEmail(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
        ]);

        // Find the OTP record
        $otpRecord = OTP::where('token', $request->token)
            ->where('email', $request->email)
            ->whereIn('type', [OTP::TYPE_REGISTRATION, OTP::TYPE_EMAIL_VERIFICATION])
            ->where('is_used', false)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        // If invalid or expired
        if (!$otpRecord) {
            return view('verification-error', [
                'message' => 'The verification link is invalid or has expired.'
            ]);
        }

        // Verify the user
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return view('verification-error', [
                'message' => 'User not found.'
            ]);
        }

        // Update user
        $user->update([
            'email_verified_at' => now(),
            'status' => 'active',
            'is_active' => true,
        ]);
        $otpRecord->markAsUsed();

        // Show success page
        return view('verification-success', [
            'user' => $user,
            'dashboardUrl' => config('app.frontend_url', 'http://192.168.100.84:8000'),
        ]);
    }

    
    public function resendVerification(Request $request)
{
    $request->validate([
        'email' => 'required|email|exists:users,email',
    ]);

    $user = User::where('email', $request->email)->first();

    // Already verified? Redirect to success or login
    if ($user->email_verified_at) {
        return redirect()->route('verification.verify', ['email' => $user->email, 'already' => 'verified'])
            ->with('message', 'Email already verified. Please login.');
    }

    // Delete old OTPs
    OTP::where('email', $user->email)
        ->whereIn('type', [OTP::TYPE_REGISTRATION, OTP::TYPE_EMAIL_VERIFICATION])
        ->delete();

    // Create new OTP
    $otpRecord = OTP::create([
        'id'    => (string) Str::uuid(),
        'email' => $user->email,
        'type'  => OTP::TYPE_EMAIL_VERIFICATION,
        'name'  => $user->name,
    ]);

    // Send email
    Mail::to($user->email)->send(
        new OTPMail($otpRecord->otp, $user->name, 'verification', $otpRecord->getVerificationUrl())
    );

    // Redirect back with success message
    return back()->with('resend_success', 'A new verification link has been sent to your email.');
}
}