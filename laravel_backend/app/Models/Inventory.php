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
            $model->calculateQuantity();
        });

        static::updating(function ($model) {
            if ($model->isDirty('product_ids')) {
                $model->calculateQuantity();
            }
        });
        
        // Ensure product_ids is always an array when retrieved
        static::retrieved(function ($model) {
            $model->ensureProductIdsArray();
        });
    }

    /**
     * Ensure product_ids is always an array
     */
    protected function ensureProductIdsArray()
    {
        if (empty($this->product_ids)) {
            $this->product_ids = [];
            return;
        }
        
        // If it's a string, try to decode it
        if (is_string($this->product_ids)) {
            $decoded = json_decode($this->product_ids, true);
            if (is_array($decoded)) {
                $this->product_ids = $decoded;
            } else {
                // Try comma-separated values
                $exploded = explode(',', $this->product_ids);
                if (count($exploded) > 1) {
                    $this->product_ids = array_map('trim', $exploded);
                } else {
                    $this->product_ids = [];
                }
            }
        }
        
        // Ensure it's always an array
        if (!is_array($this->product_ids)) {
            $this->product_ids = [];
        }
    }

    /**
     * Calculate quantity based on product_ids
     */
    protected function calculateQuantity()
    {
        if (empty($this->product_ids)) {
            $this->quantity = 0;
            return;
        }
        
        // Ensure product_ids is an array
        if (is_string($this->product_ids)) {
            $decoded = json_decode($this->product_ids, true);
            if (is_array($decoded)) {
                $this->product_ids = $decoded;
            } else {
                $this->product_ids = [];
            }
        }
        
        if (is_array($this->product_ids)) {
            $this->quantity = count($this->product_ids);
        } else {
            $this->quantity = 0;
        }
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
        // Ensure product_ids is an array
        $this->ensureProductIdsArray();
        
        if (empty($this->product_ids) || !is_array($this->product_ids)) {
            return collect();
        }
        
        try {
            return Product::with('category')
                ->whereIn('product_id', $this->product_ids)
                ->get();
        } catch (\Exception $e) {
            // If whereIn fails, return empty collection
            return collect();
        }
    }

    /**
     * Load products and category in a single call (useful for API responses).
     */
    public function loadProducts()
    {
        $this->setRelation('products', $this->getProductsAttribute());
        return $this;
    }

    /**
     * Override the getAttribute method to ensure product_ids is always an array
     */
    public function getAttribute($key)
    {
        $value = parent::getAttribute($key);
        
        if ($key === 'product_ids') {
            if (empty($value)) {
                return [];
            }
            if (is_string($value)) {
                $decoded = json_decode($value, true);
                return is_array($decoded) ? $decoded : [];
            }
            if (!is_array($value)) {
                return [];
            }
        }
        
        return $value;
    }

    /**
     * Set product_ids attribute with proper validation
     */
    public function setProductIdsAttribute($value)
    {
        if (empty($value)) {
            $this->attributes['product_ids'] = json_encode([]);
            return;
        }
        
        if (is_array($value)) {
            // Remove any null or empty values
            $value = array_filter($value, function($item) {
                return !empty($item);
            });
            $this->attributes['product_ids'] = json_encode(array_values($value));
            return;
        }
        
        if (is_string($value)) {
            // Try to decode JSON
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $decoded = array_filter($decoded, function($item) {
                    return !empty($item);
                });
                $this->attributes['product_ids'] = json_encode(array_values($decoded));
                return;
            }
            
            // Try comma-separated
            $exploded = explode(',', $value);
            if (count($exploded) > 1) {
                $exploded = array_map('trim', $exploded);
                $exploded = array_filter($exploded, function($item) {
                    return !empty($item);
                });
                $this->attributes['product_ids'] = json_encode(array_values($exploded));
                return;
            }
        }
        
        // Default to empty array
        $this->attributes['product_ids'] = json_encode([]);
    }

    /**
     * Scope to only include inventories with products
     */
    public function scopeWithProducts($query)
    {
        return $query->whereNotNull('product_ids')
            ->whereRaw('JSON_LENGTH(product_ids) > 0');
    }

    /**
     * Scope to filter by warehouse
     */
    public function scopeInWarehouse($query, $warehouseId)
    {
        return $query->where('warehouse_id', $warehouseId);
    }
}