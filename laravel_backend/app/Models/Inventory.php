<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Inventory extends Model
{
    protected $table = 'inventory';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'inventory_id';

    protected $fillable = [
        'inventory_id',
        'product_ids',
        'warehouse_id',
        'quantity',
        'created_by',
    ];

    protected $casts = [
        'product_ids' => 'array',   // JSON -> array
        'quantity'    => 'integer',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->inventory_id)) {
                $model->inventory_id = (string) Str::uuid();
            }
            // Auto-calculate quantity from product_ids array
            if (is_array($model->product_ids)) {
                $model->quantity = count($model->product_ids);
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('product_ids') && is_array($model->product_ids)) {
                $model->quantity = count($model->product_ids);
            }
        });
    }

    // Relationships
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id', 'warehouse_id');
    }

    public function createdByUser()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    /**
     * Get the actual product models for this inventory record.
     * Includes category relation.
     */
    public function getProductsAttribute()
    {
        if (empty($this->product_ids)) {
            return collect();
        }
        return Product::with('category')
            ->whereIn('product_id', $this->product_ids)
            ->get();
    }

    /**
     * Load products and category in a single call (useful for API responses).
     */
    public function loadProducts()
    {
        $this->setRelation('products', $this->getProductsAttribute());
        return $this;
    }
}