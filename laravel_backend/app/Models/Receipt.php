<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Receipt extends Model
{
    protected $table = 'receipts';
    protected $primaryKey = 'receipt_id';
    public $incrementing = false;
    protected $keyType = 'string';

    // ✅ Disable automatic timestamps (no updated_at column)
    public $timestamps = false;

    protected $fillable = [
        'receipt_id',
        'receipt_number',
        'order_id',
        'customer_name',
        'customer_phone',
        'total_amount',
        'payment_method',
        'payment_status',
        'pdf_path',
        'created_by',
        'created_at',   
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($receipt) {
            if (!$receipt->receipt_id) {
                $receipt->receipt_id = (string) Str::uuid();
            }
            // Automatically set created_at to current timestamp if not provided
            if (!$receipt->created_at) {
                $receipt->created_at = now();
            }
        });
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class, 'order_id', 'sale_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }
}