<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Purchase extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'purchase_id';

    protected $fillable = [
        'supplier_id',
        'category_id',
        'quantity_ordered',
        'unit_price',
        'subtotal',
        'selected_skus',
        'status',
    ];

    protected $casts = [
        'unit_price'     => 'decimal:2',
        'subtotal'       => 'decimal:2',
        'selected_skus'  => 'array',      // <-- added
        'status'         => 'string',
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

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }

    public function category()
    {
        return $this->belongsTo(ProductCategory::class, 'category_id', 'category_id');
    }

    public function updateStatus($newStatus)
    {
        $this->update(['status' => $newStatus]);
    }
}