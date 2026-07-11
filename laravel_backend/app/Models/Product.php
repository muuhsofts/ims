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
        'loan_selling_price' => 'array',
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

    /**
     * Get loan price for a specific company ID
     */
    public function getLoanPriceForCompany($companyId)
    {
        if (empty($this->loan_selling_price)) {
            return null;
        }
        
        $prices = is_array($this->loan_selling_price) ? $this->loan_selling_price : json_decode($this->loan_selling_price, true);
        foreach ($prices as $item) {
            if (isset($item['company_id']) && $item['company_id'] === $companyId) {
                return $item['price'];
            }
        }
        return null;
    }

    /**
     * Get all loan prices with company names
     */
    public function getLoanPricesWithNames()
    {
        if (empty($this->loan_selling_price)) {
            return [];
        }
        
        $prices = is_array($this->loan_selling_price) ? $this->loan_selling_price : json_decode($this->loan_selling_price, true);
        $result = [];
        
        foreach ($prices as $item) {
            $company = \App\Models\Company::find($item['company_id']);
            $result[] = [
                'company_id' => $item['company_id'],
                'company_name' => $company ? $company->company_name : 'Unknown Company',
                'price' => $item['price']
            ];
        }
        
        return $result;
    }

    /**
     * Get loan selling price attribute (cast to array)
     */
    public function getLoanSellingPriceAttribute($value)
    {
        if (empty($value)) {
            return [];
        }
        return is_array($value) ? $value : json_decode($value, true);
    }

    /**
     * Set loan selling price
     * Expects array of {company_id, price}
     */
    public function setLoanSellingPriceAttribute($value)
    {
        if (empty($value)) {
            $this->attributes['loan_selling_price'] = null;
        } else {
            if (is_string($value) && $this->isJson($value)) {
                $this->attributes['loan_selling_price'] = $value;
                return;
            }
            
            $formatted = [];
            if (is_array($value)) {
                foreach ($value as $item) {
                    if (isset($item['company_id']) && isset($item['price'])) {
                        $formatted[] = [
                            'company_id' => $item['company_id'],
                            'price' => (float) $item['price']
                        ];
                    }
                }
            }
            $this->attributes['loan_selling_price'] = !empty($formatted) ? json_encode($formatted) : null;
        }
    }

    private function isJson($string) {
        json_decode($string);
        return json_last_error() === JSON_ERROR_NONE;
    }

    /**
     * Get selling price based on payment type and company
     */
    public function getSellingPrice($type = 'cash', $companyId = null)
    {
        if ($type === 'loan') {
            if ($companyId) {
                $price = $this->getLoanPriceForCompany($companyId);
                if ($price !== null) {
                    return $price;
                }
            }
            $prices = $this->getLoanSellingPriceAttribute($this->loan_selling_price);
            if (!empty($prices)) {
                return $prices[0]['price'] ?? null;
            }
            return null;
        }
        return $this->cash_selling_price;
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