<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class TransferRequest extends Model
{
    public $incrementing = false;
    protected $keyType   = 'string';
    protected $primaryKey = 'request_id';

    protected $fillable = [
        'request_id',
        'requester_id',
        'cc_id',
        // 'warehouse_id',   // removed
        'requested_items',
        'status',
        'approved_by',
        'approved_at',
        'received_by',
        'received_at',
        'notes',
        'total_quantity',
        'received_quantity',
    ];

    protected $casts = [
        'requested_items'   => 'array',
        'approved_at'       => 'datetime',
        'received_at'       => 'datetime',
        'total_quantity'    => 'integer',
        'received_quantity' => 'integer',
    ];

    protected $attributes = [
        'status'            => 'pending',
        'total_quantity'    => 0,
        'received_quantity' => 0,
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->request_id)) {
                $model->request_id = (string) Str::uuid();
            }
            if (is_null($model->total_quantity))    $model->total_quantity    = 0;
            if (is_null($model->received_quantity)) $model->received_quantity = 0;
        });
    }

    // Relationships
    public function requester()
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function collectionCenter()
    {
        return $this->belongsTo(CollectionCenter::class, 'cc_id', 'cc_id');
    }

    // warehouse() removed

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function movements()
    {
        return $this->hasMany(StockMovement::class, 'request_id', 'request_id');
    }

    // Helpers
    public function getProgressPercentAttribute(): float
    {
        if ($this->total_quantity === 0) return 0.0;
        return round(($this->received_quantity / $this->total_quantity) * 100, 1);
    }

    public function isPending(): bool   { return $this->status === 'pending';   }
    public function isApproved(): bool  { return $this->status === 'approved';  }
    public function isRejected(): bool  { return $this->status === 'rejected';  }
    public function isCompleted(): bool { return $this->status === 'completed'; }
}