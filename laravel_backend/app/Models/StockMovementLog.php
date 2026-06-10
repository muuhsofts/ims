<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class StockMovementLog extends Model
{
    protected $table = 'stock_movement_logs';
    protected $primaryKey = 'log_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;  // we use created_at manually

    protected $fillable = [
        'log_id', 'product_id', 'from_type', 'from_id', 'to_type', 'to_id',
        'quantity', 'movement_type', 'reference_id', 'notes', 'performed_by', 'created_at'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'created_at' => 'datetime'
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->log_id)) {
                $model->log_id = (string) Str::uuid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }

    // Relationships (optional)
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by', 'id');
    }
}