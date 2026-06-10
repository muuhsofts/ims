<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class UserSession extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $table = 'user_sessions';

    public $timestamps = false;

    protected $fillable = [
        'id', 
        'user_id', 
        'token', 
        'ip_address', 
        'user_agent', 
        'device_name', 
        'last_activity', 
        'is_active', 
        'expires_at'
    ];

    protected $casts = [
        'last_activity' => 'datetime',
        'expires_at'    => 'datetime',
        'is_active'     => 'boolean'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->last_activity)) {
                $model->last_activity = Carbon::now();
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function isExpired()
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function updateActivity()
    {
        $this->update(['last_activity' => Carbon::now()]);
    }
}