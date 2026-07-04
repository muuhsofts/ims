<?php
// app/Models/Product.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'products';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'product_id';

    protected $fillable = [
        'category_id',
        'sku',
        'imei',
        'buying_price',
        'cash_selling_price',
        'loan_selling_price',
        'discounted_price',
        'status',
        'stock_status',
        'condition',
        'deleted_at',
    ];

    protected $casts = [
        'buying_price' => 'decimal:2',
        'cash_selling_price' => 'decimal:2',
        'loan_selling_price' => 'decimal:2',
        'discounted_price' => 'decimal:2',
        'deleted_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['product_name', 'category_name'];

    // Status constants
    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_SOLD = 'sold';
    const STATUS_DAMAGED = 'damaged';
    const STATUS_RETURN_PENDING = 'return_pending';
    const STATUS_RETURNED = 'returned';

    // Stock status constants
    const STOCK_IN_STOCK = 'in_stock';
    const STOCK_TRANSFERRED = 'transferred';
    const STOCK_RECEIVED = 'received';
    const STOCK_SOLD = 'sold';
    const STOCK_DAMAGED = 'damaged';
    const STOCK_PENDING_RETURN = 'pending_return';
    const STOCK_RETURNED = 'returned';

    // Condition constants
    const CONDITION_GOOD = 'good';
    const CONDITION_DAMAGED = 'damaged';
    const CONDITION_DEFECTIVE = 'defective';

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function category()
    {
        return $this->belongsTo(ProductCategory::class, 'category_id', 'category_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByCategory($query, $categoryId)
    {
        if ($categoryId) {
            return $query->where('category_id', $categoryId);
        }
        return $query;
    }

    public function scopeInStock($query)
    {
        return $query->where('stock_status', 'in_stock');
    }

    public function scopeReturned($query)
    {
        return $query->where('stock_status', 'returned');
    }

    public function isActive()
    {
        return $this->status === 'active';
    }

    public function isInStock()
    {
        return $this->stock_status === 'in_stock';
    }

    public function isReturned()
    {
        return $this->stock_status === 'returned';
    }

    public function setStatus($status)
    {
        $this->update(['status' => $status]);
    }

    public function setStockStatus($status)
    {
        $this->update(['stock_status' => $status]);
    }

    public function getProductNameAttribute()
    {
        if ($this->relationLoaded('category') && $this->category) {
            return $this->category->category_name . ' - ' . ($this->sku ?? $this->imei);
        }
        return 'Unknown Product';
    }

    public function getCategoryNameAttribute()
    {
        return $this->category->category_name ?? null;
    }

    // Helper to get selling price based on payment type
    public function getSellingPrice($type = 'cash')
    {
        return $type === 'cash' ? $this->cash_selling_price : $this->loan_selling_price;
    }

    // Get status badge color
    public function getStatusBadgeColor()
    {
        return match($this->status) {
            'active' => 'success',
            'inactive' => 'secondary',
            'sold' => 'info',
            'damaged' => 'error',
            'return_pending' => 'warning',
            'returned' => 'warning',
            default => 'default'
        };
    }

    // Get stock status badge color
    public function getStockStatusBadgeColor()
    {
        return match($this->stock_status) {
            'in_stock' => 'success',
            'transferred' => 'info',
            'received' => 'primary',
            'sold' => 'error',
            'damaged' => 'error',
            'pending_return' => 'warning',
            'returned' => 'warning',
            default => 'default'
        };
    }
}