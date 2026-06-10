<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AgentInventory extends Model
{
    protected $table = 'agent_inventory'; 

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'agent_inv_id';

    protected $fillable = [
        'agent_inv_id', 
        'user_id', 
        'product_id', 
        'quantity_received', 
        'quantity_sold',
        'product_ids'          
    ];

    protected $casts = [
        'quantity_received' => 'integer',
        'quantity_sold'     => 'integer',
        'product_ids'       => 'array',     // ← Important: Cast as array
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->agent_inv_id)) {
                $model->agent_inv_id = (string) Str::uuid();
            }
        });
    }

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'product_id');
    }

    // Accessors
    public function getAvailableQuantityAttribute()
    {
        return $this->quantity_received - $this->quantity_sold;
    }

    /**
     * Get count of specific product in this inventory
     */
    public function getProductCountAttribute()
    {
        return count($this->product_ids ?? []);
    }
}