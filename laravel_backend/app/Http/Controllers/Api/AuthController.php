<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\OTP;
use App\Models\FailedLoginAttempt;
use App\Models\UserSession;
use App\Models\Role;
use App\Mail\OTPMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class AuthController extends BaseApiController
{
  public function register(Request $request)
{
    try {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'phone'    => 'nullable|string',
            'role_id'  => 'required|string|exists:roles,id',   
        ]);

        DB::beginTransaction();

        $user = User::create([
            'id'         => (string) Str::uuid(),
            'name'       => $request->name,
            'email'      => $request->email,
            'password'   => Hash::make($request->password),
            'phone'      => $request->phone,
            'status'     => 'pending',
            'is_active'  => false,
            'created_by' => null,
            'role_id'    => $request->role_id,   
        ]);

        $otpRecord = OTP::create([
            'id'         => (string) Str::uuid(),
            'email'      => $user->email,
            'type'       => OTP::TYPE_REGISTRATION,
            'name'       => $user->name,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        Mail::to($user->email)->send(
            new OTPMail($otpRecord->otp, $user->name, 'verification', $otpRecord->getVerificationUrl())
        );

        DB::commit();
        return $this->created(['email' => $user->email], 'Registration successful. OTP sent.');
    } catch (\Exception $e) {
        DB::rollBack();
        return $this->serverError('Registration failed: ' . $e->getMessage());
    }
}

    public function verifyOTP(Request $request)
{
    try {
        $request->validate(['email' => 'required|email', 'otp' => 'required|string|size:6']);

        $otpRecord = OTP::where('email', $request->email)
            ->where('otp', $request->otp)
            ->where('type', OTP::TYPE_REGISTRATION)
            ->first();

        if (!$otpRecord || !$otpRecord->isValid()) {
            return $this->badRequest('Invalid or expired OTP');
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->update(['email_verified_at' => now(), 'status' => 'active', 'is_active' => true]);
        $otpRecord->markAsUsed();

        // 🔁 Send verification success email
        Mail::to($user->email)->send(new VerificationSuccessMail($user));

        $token = $user->createToken('auth_token')->plainTextToken;
        $this->createSession($user, $request);

        return $this->successResponse([
            'user'  => $user->only(['id', 'name', 'email', 'phone']),
            'role'  => $user->role ? $user->role->only(['id', 'name', 'display_name']) : null,
            'token' => $token,
        ], 'Email verified successfully');
    } catch (\Exception $e) {
        return $this->serverError('Verification failed');
    }
}

    public function login(Request $request)
    {
        try {
            $request->validate([
                'email'       => 'required|email',
                'password'    => 'required|string',
                'device_name' => 'nullable|string',
            ]);

            $user = User::where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                FailedLoginAttempt::record($request->email, $request->ip());
                return $this->unauthorized('Invalid credentials');
            }

            if (!$user->is_active || $user->status !== 'active') {
                return $this->forbidden('Account is not active. Current status: ' . ($user->status ?? 'unknown'));
            }

            if (is_null($user->email_verified_at)) {
                return $this->forbidden('Please verify your email first');
            }

            $tokenResult = $user->createToken('auth_token');
            $plainTextToken = $tokenResult->plainTextToken;
            $tokenId = $tokenResult->accessToken->id;

            $this->createSession($user, $request, $tokenId);

            $user->update([
                'last_login_at' => now(),
                'last_login_ip' => $request->ip()
            ]);

            return $this->successResponse([
                'user'                    => $user->only(['id', 'name', 'email', 'phone', 'status']),
                'role'                    => $user->role ? $user->role->only(['id', 'name', 'display_name']) : null,
                'token'                   => $plainTextToken,
                'password_days_remaining' => $user->getPasswordExpiryDaysRemaining() ?? 7,
            ], 'Login successful');
        } catch (\Exception $e) {
            return $this->serverError('Login failed: ' . $e->getMessage());
        }
    }

    //  load user logged permissions
    public function permissions(Request $request)
{
    $user = $request->user();

    $hasPermission = $user->role
        && $user->role->permissions()
            ->where('name', 'permissions.view')
            ->exists();

    if (!$hasPermission) {
        return response()->json([
            'success' => false,
            'message' => 'Missing permission: permissions.view'
        ], 403);
    }

    $role = $user->role;

    if (!$role) {
        return $this->successResponse([], 'No role assigned');
    }

    $permissions = $role->permissions->pluck('name');

    return $this->successResponse(
        $permissions,
        'User permissions retrieved'
    );
}

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return $this->successResponse(null, 'Logged out');
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return $this->successResponse([
            'user'  => $user->only(['id', 'name', 'email', 'phone', 'status']),
            'role'  => $user->role ? $user->role->only(['id', 'name', 'display_name']) : null,
            'password_days_remaining' => $user->getPasswordExpiryDaysRemaining(),
        ], 'Profile retrieved');
    }

    public function updateProfile(Request $request)
    {
        $request->validate(['name' => 'sometimes|string|max:255', 'phone' => 'nullable|string|max:20']);
        $user = $request->user();
        $user->update($request->only(['name', 'phone']));
        return $this->successResponse(['user' => $user->only(['id', 'name', 'email', 'phone', 'status'])], 'Profile updated');
    }

    public function forgotPassword(Request $request)
    {
        try {
            $request->validate(['email' => 'required|email|exists:users,email']);
            $user = User::where('email', $request->email)->firstOrFail();

            $otpRecord = OTP::create([
                'id'    => (string) Str::uuid(),
                'email' => $request->email,
                'type'  => OTP::TYPE_PASSWORD_RESET,
                'name'  => $user->name,
            ]);

            Mail::to($request->email)->send(
                new OTPMail($otpRecord->otp, $user->name, 'reset')
            );

            return $this->successResponse(null, 'Password reset OTP sent');
        } catch (\Exception $e) {
            return $this->serverError('Failed to send OTP');
        }
    }

    public function resetPassword(Request $request)
    {
        try {
            $request->validate([
                'email'    => 'required|email',
                'otp'      => 'required|string|size:6',
                'password' => 'required|string|min:8|confirmed',
            ]);

            $otpRecord = OTP::where('email', $request->email)
                ->where('otp', $request->otp)
                ->where('type', OTP::TYPE_PASSWORD_RESET)
                ->first();

            if (!$otpRecord || !$otpRecord->isValid()) {
                return $this->badRequest('Invalid or expired OTP');
            }

            $user = User::where('email', $request->email)->firstOrFail();
            $user->updatePassword($request->password);
            $otpRecord->markAsUsed();
            $user->tokens()->delete();

            return $this->successResponse(null, 'Password reset successfully');
        } catch (\Exception $e) {
            return $this->serverError('Password reset failed');
        }
    }

    public function changePassword(Request $request)
    {
        try {
            $request->validate([
                'current_password' => 'required|string',
                'password'         => 'required|string|min:8|confirmed',
            ]);

            $user = $request->user();

            if (!Hash::check($request->current_password, $user->password)) {
                return $this->badRequest('Current password is incorrect');
            }

            if ($user->hasUsedPassword($request->password)) {
                return $this->badRequest('Cannot reuse a recent password');
            }

            $user->updatePassword($request->password);
            return $this->successResponse(null, 'Password changed successfully');
        } catch (\Exception $e) {
            return $this->serverError('Failed to change password');
        }
    }

    public function sessions(Request $request)
    {
        $sessions = UserSession::where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->orderBy('last_activity', 'desc')
            ->get();
        return $this->successResponse($sessions, 'Sessions retrieved');
    }

    public function revokeSession(Request $request, $sessionId)
    {
        $session = UserSession::where('id', $sessionId)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();
        $session->update(['is_active' => false]);
        return $this->successResponse(null, 'Session revoked');
    }

    public function revokeAllSessions(Request $request)
    {
        $request->user()->tokens()->delete();
        UserSession::where('user_id', $request->user()->id)->update(['is_active' => false]);
        return $this->successResponse(null, 'All sessions revoked');
    }

   private function createSession(User $user, Request $request, string $tokenId = null): void
{
    UserSession::where('user_id', $user->id)->where('expires_at', '<', now())->delete();
    
    $deviceName = $this->getDeviceNameFromUserAgent($request); 
    
    UserSession::create([
        'id'            => (string) Str::uuid(),
        'user_id'       => $user->id,
        'token'         => $tokenId ?? (string) Str::uuid(),
        'ip_address'    => $request->ip(),
        'user_agent'    => $request->userAgent(),
        'device_name'   => $deviceName,   // ← no longer from request
        'last_activity' => now(),
        'expires_at'    => now()->addMinutes(30),
        'is_active'     => true,
    ]);
}

    private function getDeviceNameFromUserAgent(Request $request): string
{
    $userAgent = $request->userAgent();
    
    if (str_contains($userAgent, 'Postman')) return 'Postman API Client';
    if (str_contains($userAgent, 'Insomnia')) return 'Insomnia API Client';
    if (str_contains($userAgent, 'curl')) return 'cURL';
    if (str_contains($userAgent, 'Mozilla')) {
        if (str_contains($userAgent, 'Windows')) return 'Windows Browser';
        if (str_contains($userAgent, 'Macintosh')) return 'Mac Browser';
        if (str_contains($userAgent, 'iPhone')) return 'iPhone Browser';
        if (str_contains($userAgent, 'Android')) return 'Android Browser';
        return 'Web Browser';
    }
    
    // Fallback: first 50 chars of User-Agent
    return substr($userAgent, 0, 50);
}



}