<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class InventoryLog extends Model
{
    protected $table = 'inventory_logs';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'log_date',
        'product_id',
        'product_name',
        'category_id',
        'category_name',
        'action',
        'quantity_change',
        'new_quantity',
        'reference_id',
        'notes',
        'performed_by',
        'performed_by_name',
        'created_at',
    ];

    // ← This was missing — auto-generate UUID on create
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }
}