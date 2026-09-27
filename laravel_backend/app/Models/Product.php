<?php
// app/Models/Product.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'products';

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'product_id';

    // ---------------------------------------------------------------------
    // CONSTANTS
    // ---------------------------------------------------------------------

    const STATUS_ACTIVE          = 'active';
    const STATUS_INACTIVE        = 'inactive';
    const STATUS_SOLD            = 'sold';
    const STATUS_DAMAGED         = 'damaged';
    const STATUS_RETURN_PENDING  = 'return_pending';
    const STATUS_RETURNED        = 'returned';

    const STOCK_IN_STOCK        = 'in_stock';
    const STOCK_TRANSFERRED     = 'transferred';
    const STOCK_RECEIVED        = 'received';
    const STOCK_SOLD            = 'sold';
    const STOCK_DAMAGED         = 'damaged';
    const STOCK_PENDING_RETURN  = 'pending_return';
    const STOCK_RETURNED        = 'returned';

    const CONDITION_GOOD      = 'good';
    const CONDITION_DAMAGED   = 'damaged';
    const CONDITION_DEFECTIVE = 'defective';

    // ---------------------------------------------------------------------
    // ATTRIBUTES
    // ---------------------------------------------------------------------

    protected $fillable = [
        'category_id',
        'sku',
        'imei',
        'buying_price',
        'cash_selling_price',
        'loan_selling_price',
        'discounted_price',
        'status',
        'stock_status',
        'condition',
        'deleted_at',
    ];

    protected $casts = [
        'buying_price'       => 'decimal:2',
        'cash_selling_price' => 'decimal:2',
        'discounted_price'   => 'decimal:2',
        // loan_selling_price is intentionally NOT cast — the custom
        // accessor/mutator below handles array <-> JSON + company_name.
        'deleted_at'         => 'datetime',
        'created_at'         => 'datetime',
        'updated_at'         => 'datetime',
    ];

    protected $appends = ['product_name', 'category_name'];

    // ---------------------------------------------------------------------
    // BOOT
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

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'category_id', 'category_id');
    }

    // ---------------------------------------------------------------------
    // MUTATOR
    // ---------------------------------------------------------------------

    /**
     * Normalize incoming loan_selling_price to a clean array of
     * {company_id, price} pairs. Stored as JSON string in DB.
     */
    public function setLoanSellingPriceAttribute($value): void
    {
        if (empty($value)) {
            $this->attributes['loan_selling_price'] = null;
            return;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : [];
        }

        $formatted = [];
        foreach ((array) $value as $item) {
            if (!empty($item['company_id']) && isset($item['price'])) {
                $formatted[] = [
                    'company_id' => $item['company_id'],
                    'price'      => (float) $item['price'],
                ];
            }
        }

        $this->attributes['loan_selling_price'] =
            !empty($formatted) ? json_encode($formatted) : null;
    }

    // ---------------------------------------------------------------------
    // ACCESSOR — enriched loan_selling_price
    // ---------------------------------------------------------------------

    /**
     * Returns loan_selling_price enriched with company_name.
     * One whereIn query — no N+1 per row.
     */
    public function getLoanSellingPriceAttribute($value): array
    {
        $prices = $this->decodeLoanPrices($value);
        if (empty($prices)) {
            return [];
        }

        $companyIds = array_filter(array_column($prices, 'company_id'));
        $companies  = Company::nameMapFor($companyIds);

        return array_map(fn ($item) => [
            'company_id'   => $item['company_id'],
            'company_name' => $companies[$item['company_id']] ?? 'Unknown Company',
            'price'        => (float) $item['price'],
        ], $prices);
    }

    /**
     * Internal: decode raw loan_selling_price.
     */
    private function decodeLoanPrices($value = null): array
    {
        $value = $value ?? ($this->attributes['loan_selling_price'] ?? null);

        if (empty($value)) {
            return [];
        }

        if (is_array($value)) {
            return $value;
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    // ---------------------------------------------------------------------
    // ACCESSORS
    // ---------------------------------------------------------------------

    public function getProductNameAttribute(): string
    {
        if ($this->relationLoaded('category') && $this->category) {
            return $this->category->category_name . ' - ' . ($this->sku ?? $this->imei);
        }
        return 'Unknown Product';
    }

    public function getCategoryNameAttribute(): ?string
    {
        return $this->category?->category_name;
    }

    public function getStatusBadgeColorAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_ACTIVE         => 'success',
            self::STATUS_INACTIVE       => 'secondary',
            self::STATUS_SOLD           => 'info',
            self::STATUS_DAMAGED        => 'error',
            self::STATUS_RETURN_PENDING => 'warning',
            self::STATUS_RETURNED       => 'warning',
            default                     => 'default',
        };
    }

    public function getStockStatusBadgeColorAttribute(): string
    {
        return match ($this->stock_status) {
            self::STOCK_IN_STOCK       => 'success',
            self::STOCK_TRANSFERRED    => 'info',
            self::STOCK_RECEIVED       => 'primary',
            self::STOCK_SOLD           => 'error',
            self::STOCK_DAMAGED        => 'error',
            self::STOCK_PENDING_RETURN => 'warning',
            self::STOCK_RETURNED       => 'warning',
            default                    => 'default',
        };
    }

    // ---------------------------------------------------------------------
    // SCOPES
    // ---------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeByCategory($query, ?string $categoryId)
    {
        return $categoryId ? $query->where('category_id', $categoryId) : $query;
    }

    public function scopeInStock($query)
    {
        return $query->where('stock_status', self::STOCK_IN_STOCK);
    }

    public function scopeReturned($query)
    {
        return $query->where('stock_status', self::STOCK_RETURNED);
    }

    // ---------------------------------------------------------------------
    // STATE HELPERS
    // ---------------------------------------------------------------------

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isInStock(): bool
    {
        return $this->stock_status === self::STOCK_IN_STOCK;
    }

    public function isReturned(): bool
    {
        return $this->stock_status === self::STOCK_RETURNED;
    }

    public function setStatus(string $status): bool
    {
        return $this->update(['status' => $status]);
    }

    public function setStockStatus(string $status): bool
    {
        return $this->update(['stock_status' => $status]);
    }

    // ---------------------------------------------------------------------
    // PRICING HELPERS
    // ---------------------------------------------------------------------

    public function getLoanPriceForCompany(string $companyId): ?float
    {
        foreach ($this->decodeLoanPrices() as $item) {
            if (($item['company_id'] ?? null) === $companyId) {
                return (float) $item['price'];
            }
        }
        return null;
    }

    public function getSellingPrice(string $type = 'cash', ?string $companyId = null): ?float
    {
        if ($type === 'loan') {
            if ($companyId) {
                $price = $this->getLoanPriceForCompany($companyId);
                if ($price !== null) {
                    return $price;
                }
            }
            $prices = $this->decodeLoanPrices();
            return isset($prices[0]['price']) ? (float) $prices[0]['price'] : null;
        }

        return $this->cash_selling_price !== null
            ? (float) $this->cash_selling_price
            : null;
    }
}