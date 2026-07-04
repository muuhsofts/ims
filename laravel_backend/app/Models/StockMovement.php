<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class StockMovement extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'movement_id';
    public $timestamps = false;

    protected $fillable = [
        'movement_id', 
        'request_id', 
        'product_id', 
        'from_type', 
        'from_id',
        'to_type', 
        'to_id', 
        'quantity', 
        'movement_type', 
        'reference_id', 
        'notes', 
        'performed_by', 
        'created_at'
    ];

    protected $casts = [
        'quantity'   => 'integer',
        'created_at' => 'datetime'
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->movement_id)) {
                $model->movement_id = (string) Str::uuid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }

    // ==================== RELATIONSHIPS ====================

    public function request()
    {
        return $this->belongsTo(TransferRequest::class, 'request_id', 'request_id')
                    ->with('requester');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id')
                    ->with('category');
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by', 'id');
    }

    public function collectionCenter()
    {
        return $this->belongsTo(CollectionCenter::class, 'to_id', 'cc_id');
    }

    // ==================== ACCESSORS ====================

    public function getProductDisplayNameAttribute()
    {
        $p = $this->product;
        if (!$p) return 'N/A';

        $name = $p->category?->model 
                ?? $p->category?->category_name 
                ?? 'Unknown Product';

        if ($p->color) $name .= " - {$p->color}";
        return $name;
    }

    public function getCcNameAttribute()
    {
        if ($this->to_type === 'collection_center') {
            return $this->collectionCenter?->cc_name;
        }
        return null;
    }

    public function getRequestNameAttribute()
    {
        if (!$this->request) return 'N/A';
        return $this->request->requester?->name 
               ?? 'Request #' . substr($this->request_id, 0, 8);
    }

    public function getRequesterNameAttribute()
    {
        return $this->request?->requester?->name;
    }

    public function getFromNameAttribute()
    {
        return match ($this->from_type) {
            'warehouse'        => optional(Warehouse::find($this->from_id))->name ?? 'Unknown Warehouse',
            'collection_center'=> optional(CollectionCenter::find($this->from_id))->cc_name ?? 'Unknown Collection Center',
            'sales_agent'      => optional(User::find($this->from_id))->name ?? 'Unknown Sales Agent',
            default            => null,
        };
    }

    public function getToNameAttribute()
    {
        return match ($this->to_type) {
            'warehouse'        => optional(Warehouse::find($this->to_id))->name ?? 'Unknown Warehouse',
            'collection_center'=> optional(CollectionCenter::find($this->to_id))->cc_name ?? 'Unknown Collection Center',
            'sales_agent'      => optional(User::find($this->to_id))->name ?? 'Unknown Sales Agent',
            default            => null,
        };
    }

    public function getMovementTypeDescriptionAttribute()
    {
        // Get human-readable labels for movement types
        $typeLabels = [
            'purchase' => 'Purchase',
            'transfer' => 'Transfer',
            'sale' => 'Sale',
            'return' => 'Return',
            'adjustment' => 'Adjustment',
            'loss' => 'Loss',
            'return_request' => 'Return Request',
            'return_approved' => 'Returned',
            'return_completed' => 'Return Completed',
            'return_cancelled' => 'Return Cancelled',
        ];

        $typeLabel = $typeLabels[$this->movement_type] ?? ucfirst(str_replace('_', ' ', $this->movement_type));
        
        $fromLabel = match ($this->from_type) {
            'warehouse'         => 'Warehouse',
            'collection_center' => 'Collection Center',
            'sales_agent'       => 'Sales Agent',
            default             => 'Unknown Source',
        };
        
        $toLabel = match ($this->to_type) {
            'warehouse'         => 'Warehouse',
            'collection_center' => 'Collection Center',
            'sales_agent'       => 'Sales Agent',
            default             => 'Unknown Destination',
        };

        // Custom descriptions for return types
        if ($this->movement_type === 'return_request') {
            return "Return Requested from {$fromLabel} to {$toLabel}";
        }
        if ($this->movement_type === 'return_approved') {
            return "Returned from {$fromLabel} to {$toLabel}";
        }
        if ($this->movement_type === 'return_completed') {
            return "Return Completed from {$fromLabel} to {$toLabel}";
        }
        if ($this->movement_type === 'return_cancelled') {
            return "Return Cancelled";
        }
        if ($this->movement_type === 'purchase') {
            return "Purchase → {$toLabel}";
        }
        if ($this->movement_type === 'sale') {
            return "Sale from {$fromLabel}";
        }
        if ($this->movement_type === 'adjustment') {
            return "Stock Adjustment ({$fromLabel})";
        }
        if ($this->movement_type === 'loss') {
            return "Stock Loss from {$fromLabel}";
        }
        
        return "{$typeLabel} from {$fromLabel} to {$toLabel}";
    }
}