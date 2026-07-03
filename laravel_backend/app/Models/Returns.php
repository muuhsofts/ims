<?php
// app/Models/Returns.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Returns extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'returns';
    protected $primaryKey = 'return_id';
    public $incrementing = false;
    protected $keyType = 'string';

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
        'return_date',
        'completed_date',
        'notes',
        'performed_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'return_date' => 'datetime',
        'completed_date' => 'datetime',
        'approved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
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
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'customer_id');
    }

    public function stockMovement()
    {
        return $this->hasOne(StockMovement::class, 'reference_id', 'return_id');
    }

    public function performedBy()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'returned');
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

    public function scopeByAgent($query, $agentId)
    {
        return $query->where('agent_id', $agentId);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('performed_by', $userId);
    }

    public function scopeByImei($query, $imei)
    {
        return $query->where('imei', $imei);
    }

    public function scopeByCustomer($query, $customerName)
    {
        return $query->where('customer_name', 'LIKE', "%{$customerName}%");
    }

    // Helper methods
    public function isPending()
    {
        return $this->status === 'returned';
    }

    public function isApproved()
    {
        return $this->status === 'approved';
    }

    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    public function isCancelled()
    {
        return $this->status === 'cancelled';
    }

    public function canBeApproved()
    {
        return $this->isPending();
    }

    public function canBeCancelled()
    {
        return $this->isPending();
    }

    // Accessors
    public function getStatusLabelAttribute()
    {
        return [
            'returned' => 'Pending',
            'approved' => 'Approved',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
        ][$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute()
    {
        return [
            'returned' => 'warning',
            'approved' => 'info',
            'completed' => 'success',
            'cancelled' => 'error',
        ][$this->status] ?? 'default';
    }
}