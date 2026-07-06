<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class OTP extends Model
{
    protected $table = 'otps';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'email', 'otp', 'token', 'name', 'user_data', 'expires_at',
        'is_used', 'type', 'ip_address', 'user_agent', 'attempts', 'last_request_at'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_used' => 'boolean',
        'user_data' => 'array',
        'last_request_at' => 'datetime'
    ];

    const TYPE_REGISTRATION = 'registration';
    const TYPE_PASSWORD_RESET = 'password_reset';
    const TYPE_EMAIL_VERIFICATION = 'email_verification';
    const TYPE_LOGIN = 'login';

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) $model->id = (string) Str::uuid();
            if (empty($model->otp)) $model->otp = rand(100000, 999999);
            if (empty($model->token)) $model->token = Str::random(64);
            if (empty($model->expires_at)) $model->expires_at = Carbon::now()->addMinutes(10);
            if (empty($model->attempts)) $model->attempts = 0;
        });
    }

    public function isValid(): bool
    {
        return !$this->is_used && $this->expires_at && $this->expires_at->isFuture();
    }

    public function scopeValid($query)
    {
        return $query->where('is_used', false)->where('expires_at', '>', Carbon::now());
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByEmail($query, $email)
    {
        return $query->where('email', $email);
    }

    public function scopeByToken($query, $token)
    {
        return $query->where('token', $token);
    }

    public function incrementAttempts()
    {
        $this->increment('attempts');
        $this->update(['last_request_at' => Carbon::now()]);
        return $this;
    }

    public function isMaxAttemptsReached(): bool
    {
        return $this->attempts >= 3;
    }

    public function markAsUsed()
    {
        $this->update(['is_used' => true]);
        return $this;
    }

    public function getVerificationUrl(): string
    {
        return url('/verify-email?token=' . $this->token . '&email=' . urlencode($this->email));
    }

    public function getApiVerificationUrl(): string
    {
        return url('/api/verification/verify-email?token=' . $this->token . '&email=' . urlencode($this->email));
    }

    public function getOtpMessage(): string
    {
        return "Your verification code is: {$this->otp}\n\nThis code expires in 10 minutes.";
    }

    public function getRemainingSeconds(): int
    {
        if (!$this->expires_at) return 0;
        $diff = Carbon::now()->diffInSeconds($this->expires_at, false);
        return $diff > 0 ? $diff : 0;
    }

    public function getFormattedRemainingTime(): string
    {
        $seconds = $this->getRemainingSeconds();
        if ($seconds <= 0) return 'Expired';
        $minutes = floor($seconds / 60);
        $remainingSeconds = $seconds % 60;
        if ($minutes > 0) return "{$minutes}m {$remainingSeconds}s";
        return "{$seconds}s";
    }
}