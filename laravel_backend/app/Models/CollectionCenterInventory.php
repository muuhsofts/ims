<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CollectionCenterInventory extends Model
{
    protected $table = 'collection_center_inventory';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'cc_inventory_id';

    protected $fillable = [
        'cc_inventory_id', 'cc_id', 'source_warehouse_id', 'product_ids', 'quantity', 'cc_inventory_status'
    ];

    protected $casts = [
        'product_ids' => 'array',
        'quantity' => 'integer',
        'cc_inventory_status' => 'string',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->cc_inventory_id)) {
                $model->cc_inventory_id = (string) Str::uuid();
            }
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

    public function collectionCenter()
    {
        return $this->belongsTo(CollectionCenter::class, 'cc_id', 'cc_id');
    }

    public function sourceWarehouse()
    {
        return $this->belongsTo(Warehouse::class, 'source_warehouse_id', 'warehouse_id');
    }
}