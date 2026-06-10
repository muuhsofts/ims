<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CollectionCenter extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'cc_id';

    protected $fillable = [
        'cc_id', 'cc_name', 'location', 'owner_id', 'status'
    ];

    protected $casts = [
        'status' => 'string',
        'deleted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->cc_id)) {
                $model->cc_id = (string) Str::uuid();
            }
        });
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id', 'id');
    }

    public function inventory()
    {
        return $this->hasOne(CollectionCenterInventory::class, 'cc_id', 'cc_id');
    }
}