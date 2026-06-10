<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuditTrail extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;   
    protected $table = 'audit_trails';

    protected $fillable = [
        'id',
        'user_id',
        'user_email',
        'user_name',
        'user_role',
        'action',
        'action_type',
        'module',
        'description',
        'old_data',
        'new_data',
        'ip_address',
        'user_agent',
        'request_method',
        'request_url',
        'response_status',
        'execution_time_ms',
        'created_at',          
    ];

    protected $casts = [
        'old_data' => 'array',
        'new_data' => 'array',
        'created_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now(); 
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function scopeFromDate($query, $date)
    {
        if ($date) return $query->whereDate('created_at', '>=', $date);
        return $query;
    }

    public function scopeToDate($query, $date)
    {
        if ($date) return $query->whereDate('created_at', '<=', $date);
        return $query;
    }

    public function scopeDateBetween($query, $fromDate, $toDate)
    {
        if ($fromDate) $query->whereDate('created_at', '>=', $fromDate);
        if ($toDate) $query->whereDate('created_at', '<=', $toDate);
        return $query;
    }
}