<?php
// app/Models/Customer.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Customer extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'customer_id';

    protected $fillable = [
        'customer_id', 'customer_name', 'nida', 'msisdn', 'email', 'status', 'created_by'
    ];

    protected $casts = [
        'status' => 'string',
        'deleted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->customer_id)) {
                $model->customer_id = (string) Str::uuid();
            }
            // Automatically set created_by from the authenticated user
            if (empty($model->created_by) && auth()->check()) {
                $model->created_by = auth()->id();  // UUID from users table
            }
        });
    }

    // Relationship with the user who created this customer
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    // Optional: relationship with sales
    public function sales()
    {
        return $this->hasMany(Sale::class, 'customer_id', 'customer_id');
    }
}