<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class StockDistributionLog extends Model
{
    protected $table = 'stock_distribution_logs';
    protected $primaryKey = 'log_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'log_id', 'distribution_id', 'product_id', 'from_cc_id', 'to_agent_id',
        'quantity', 'status', 'notes', 'performed_by', 'created_at'
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

    // Relationships
    public function distribution()
    {
        return $this->belongsTo(StockDistribution::class, 'distribution_id', 'distribution_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    public function collectionCenter()
    {
        return $this->belongsTo(CollectionCenter::class, 'from_cc_id', 'cc_id');
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'to_agent_id', 'id');
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by', 'id');
    }
}