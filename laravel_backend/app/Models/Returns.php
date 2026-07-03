<?php
// app/Models/Returns.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Returns extends Model
{
    protected $table = 'returns';
    
    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'return_id';

    protected $fillable = [
        'return_id',
        'customer_name',
        'imei',
        'product_id',
        'sale_id',
        'agent_id',
        'customer_id',
        'request_id',
        'status',
        'return_reason',
        'return_date',
        'condition',
        'approved_by',
        'approved_at',
        'completed_by',
        'completed_at',
        'cancelled_at',
        'notes',
        'performed_by',
    ];

    protected $casts = [
        'return_date' => 'datetime',
        'approved_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->return_id)) {
                $model->return_id = (string) Str::uuid();
            }
        });
    }

    // Relationships
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class, 'sale_id', 'sale_id');
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id', 'id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'customer_id');
    }

    public function performedBy()
    {
        return $this->belongsTo(User::class, 'performed_by', 'id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by', 'id');
    }

    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by', 'id');
    }

    public function stockMovement()
    {
        return $this->hasOne(StockMovement::class, 'reference_id', 'return_id')
            ->where('movement_type', 'return');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }
}