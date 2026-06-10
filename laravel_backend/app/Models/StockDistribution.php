<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class StockDistribution extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'distribution_id';

    protected $fillable = [
        'distribution_id',
        'user_id',
        'cc_id',
        'product_id',
        'quantity',
        'quantity_received',
        'status',
        'performed_by',
        'approved_by',
        'received_by',
        'notes',
    ];

    protected $casts = [
        'quantity'          => 'integer',
        'quantity_received' => 'integer',
        'created_at'        => 'datetime',
        'updated_at'        => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->distribution_id)) {
                $model->distribution_id = (string) Str::uuid();
            }
            // Default quantity_received to 0
            if (is_null($model->quantity_received)) {
                $model->quantity_received = 0;
            }
        });
    }

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function collectionCenter()
    {
        return $this->belongsTo(CollectionCenter::class, 'cc_id', 'cc_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    // Helper methods
    public function isFullyReceived()
    {
        return $this->quantity_received >= $this->quantity;
    }

    public function getRemainingQuantityAttribute()
    {
        return $this->quantity - $this->quantity_received;
    }
}