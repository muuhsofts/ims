<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class FailedLoginAttempt extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $table = 'failed_login_attempts';

    protected $fillable = ['id', 'email', 'ip_address', 'attempt_count', 'last_attempt_at'];

    protected $casts = [
        'last_attempt_at' => 'datetime'
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public static function record($email, $ipAddress)
    {
        $attempt = self::where('email', $email)->where('ip_address', $ipAddress)->first();
        if ($attempt) {
            $attempt->increment('attempt_count');
            $attempt->update(['last_attempt_at' => Carbon::now()]);
        } else {
            self::create([
                'id' => (string) Str::uuid(),
                'email' => $email,
                'ip_address' => $ipAddress,
                'attempt_count' => 1,
                'last_attempt_at' => Carbon::now()
            ]);
        }
    }

    public static function isBlocked($email, $ipAddress, $maxAttempts = 10, $blockMinutes = 30)
    {
        $attempt = self::where('email', $email)->where('ip_address', $ipAddress)->first();
        if (!$attempt) return false;
        if ($attempt->attempt_count >= $maxAttempts) {
            return $attempt->last_attempt_at->addMinutes($blockMinutes)->isFuture();
        }
        return false;
    }

    public static function reset($email, $ipAddress)
    {
        self::where('email', $email)->where('ip_address', $ipAddress)->delete();
    }
}