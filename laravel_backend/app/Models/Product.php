<?php

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
        'sku',              // new
        'imei',
        'buying_price',
        'selling_price',
        'status',
        'stock_status',
    ];

    protected $casts = [
        'buying_price'  => 'decimal:2',
        'selling_price' => 'decimal:2',
        'deleted_at'    => 'datetime',
        'created_at'    => 'datetime',
        'updated_at'    => 'datetime',
        'stock_status'  => 'string',
    ];

    protected $appends = ['product_name', 'category_name'];

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

    public function isActive()
    {
        return $this->status === 'active';
    }

    public function setStatus($status)
    {
        $this->update(['status' => $status]);
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
}