<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Sale extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'sale_id';

    protected $fillable = [
        'sale_id',
        'agent_id',
        'customer_id',
        'product_id',
        'total_amount',
        'payment_method',
        'company_id',   // ✅ new
        'status',
        'notes'
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'created_at'   => 'datetime',
        'updated_at'   => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->sale_id)) {
                $model->sale_id = (string) Str::uuid();
            }
        });
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id', 'id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'customer_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    // ✅ Relationship to Company
    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id', 'id');
    }

    public function receipt()
    {
        return $this->hasOne(Receipt::class, 'order_id', 'sale_id');
    }
}