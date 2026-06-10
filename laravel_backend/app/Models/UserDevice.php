<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;

class UserDevice extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $table = 'user_devices';

    protected $fillable = ['id', 'user_id', 'device_id', 'device_name', 'device_type', 'os_version', 'app_version', 'fcm_token', 'apns_token', 'is_trusted', 'last_used_at'];

    protected $casts = [
        'is_trusted' => 'boolean',
        'last_used_at' => 'datetime'
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

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function updateLastUsed()
    {
        $this->update(['last_used_at' => Carbon::now()]);
    }
}