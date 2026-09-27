<?php
// app/Models/Company.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Company extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'companies';

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
        'created_by',
    ];

    protected $casts = [
        'status'     => 'string',
        'deleted_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ---------------------------------------------------------------------
    // BOOT — auto UUID
    // ---------------------------------------------------------------------

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    // ---------------------------------------------------------------------
    // RELATIONSHIPS
    // ---------------------------------------------------------------------

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    // ---------------------------------------------------------------------
    // SCOPES
    // ---------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('company_name', 'LIKE', "%{$search}%")
              ->orWhere('address', 'LIKE', "%{$search}%")
              ->orWhere('phone', 'LIKE', "%{$search}%")
              ->orWhere('email', 'LIKE', "%{$search}%");
        });
    }

    public function scopeDropdown($query)
    {
        return $query->active()
                     ->select('id', 'company_name')
                     ->orderBy('company_name');
    }

    // ---------------------------------------------------------------------
    // ACCESSORS
    // ---------------------------------------------------------------------

    public function getFormattedAddressAttribute(): string
    {
        return $this->address ?? 'N/A';
    }

    public function getStatusLabelAttribute(): string
    {
        return ucfirst($this->status ?? '');
    }

    // ---------------------------------------------------------------------
    // MUTATORS
    // ---------------------------------------------------------------------

    public function setCompanyNameAttribute($value): void
    {
        $this->attributes['company_name'] = trim((string) $value);
    }

    // ---------------------------------------------------------------------
    // HELPERS — id + name
    // ---------------------------------------------------------------------

    public function toDropdownArray(): array
    {
        return [
            'id'   => $this->id,
            'name' => $this->company_name,
        ];
    }

    /**
     * All active companies as [id => name] map.
     */
    public static function getDropdownList(): array
    {
        return static::active()
            ->orderBy('company_name')
            ->pluck('company_name', 'id')
            ->toArray();
    }

    /**
     * All active companies as [{ id, name }] array.
     */
    public static function getDropdownOptions(): array
    {
        return static::active()
            ->orderBy('company_name')
            ->get(['id', 'company_name'])
            ->map(fn ($c) => [
                'id'   => $c->id,
                'name' => $c->company_name,
            ])
            ->toArray();
    }

    /**
     * Lookup map for enriching other models (no N+1).
     * Uses withTrashed() so soft-deleted companies still resolve names
     * for historical records (e.g., past loan prices on products).
     */
    public static function nameMapFor(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        return static::withTrashed()
            ->whereIn('id', array_unique($ids))
            ->pluck('company_name', 'id')
            ->toArray();
    }
}