<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Company extends Model
{
    use SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'company_name',
        'address',
        'phone',
        'email',
        'status',
        'created_by'
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
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    // ========== RELATIONSHIPS ==========
    
    /**
     * Get the user who created this company
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    // ========== SCOPES ==========
    
    /**
     * Scope a query to only include active companies
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope a query to only include inactive companies
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    /**
     * Scope a query to search by company name
     */
    public function scopeSearch($query, $search)
    {
        return $query->where('company_name', 'LIKE', "%{$search}%")
                     ->orWhere('address', 'LIKE', "%{$search}%")
                     ->orWhere('phone', 'LIKE', "%{$search}%")
                     ->orWhere('email', 'LIKE', "%{$search}%");
    }

    // ========== ACCESSORS ==========
    
    /**
     * Get formatted address
     */
    public function getFormattedAddressAttribute()
    {
        return $this->address ?? 'N/A';
    }

    /**
     * Get company status label
     */
    public function getStatusLabelAttribute()
    {
        return ucfirst($this->status);
    }

    // ========== MUTATORS ==========
    
    /**
     * Set the company name and ensure it's properly formatted
     */
    public function setCompanyNameAttribute($value)
    {
        $this->attributes['company_name'] = trim($value);
    }
}