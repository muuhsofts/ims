<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Warehouse extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'warehouses';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'warehouse_id';

    protected $fillable = [
        
        'name',
        'location',
        'manager_id',
        'status',
    ];

    protected $casts = [
        'status' => 'string',
        'deleted_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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

    // Relationships
    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id', 'id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    // Helpers
    public function isActive()
    {
        return $this->status === 'active';
    }

    public function setStatus($status)
    {
        $this->update(['status' => $status]);
    }
}