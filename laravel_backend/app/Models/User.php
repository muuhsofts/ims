<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $with = ['role'];

    protected $fillable = [
        'id', 'name', 'email', 'password', 'phone', 'address', 'status', 'role_id',
        'email_verified_at', 'google_id', 'google_avatar', 'google_token',
        'password_changed_at', 'password_expiry_notified_at',
        'login_attempts', 'locked_until', 'last_login_at', 'last_login_ip',
        'two_factor_secret', 'two_factor_enabled', 'refresh_token',
        'device_name', 'device_token', 'is_active', 'deleted_at',
        'created_by','cc_id'
    ];

    protected $hidden = [
        'password', 'remember_token', 'two_factor_secret', 'refresh_token'
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password_changed_at' => 'datetime',
        'password_expiry_notified_at' => 'datetime',
        'locked_until' => 'datetime',
        'last_login_at' => 'datetime',
        'two_factor_enabled' => 'boolean',
        'is_active' => 'boolean',
        'deleted_at' => 'datetime'
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) $model->id = (string) Str::uuid();
            if (empty($model->password_changed_at)) $model->password_changed_at = Carbon::now();
            if (empty($model->is_active)) $model->is_active = true;
        });
    }

    // ========== RELATIONSHIPS ==========
    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'permission_user', 'user_id', 'permission_id');
    }

    public function passwordHistory()
    {
        return $this->hasMany(PasswordHistory::class, 'user_id', 'id');
    }

    public function sessions()
    {
        return $this->hasMany(UserSession::class, 'user_id', 'id');
    }

    public function loginActivities()
    {
        return $this->hasMany(LoginActivity::class, 'user_id', 'id');
    }

    public function devices()
    {
        return $this->hasMany(UserDevice::class, 'user_id', 'id');
    }

    public function auditTrails()
    {
        return $this->hasMany(AuditTrail::class, 'user_id', 'id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    public function createdUsers()
    {
        return $this->hasMany(User::class, 'created_by', 'id');
    }

    // ========== ROLE HELPERS (single role) ==========
    public function hasRole($role): bool
    {
        if (!$this->role) return false;
        if (is_string($role)) return $this->role->name === $role;
        return $this->role->id === $role->id;
    }

    public function hasAnyRole(array $roles): bool
    {
        if (!$this->role) return false;
        foreach ($roles as $role) {
            if ($this->hasRole($role)) return true;
        }
        return false;
    }

    public function isAdministrator(): bool
    {
        return $this->hasRole('ADMINISTRATOR');
    }

    public function isManager(): bool
    {
        return $this->hasRole('MANAGER');
    }

    public function isStockController(): bool
    {
        return $this->hasRole('STOCK_CONTROLLER');
    }

    public function isSalesAgent(): bool
    {
        return $this->hasRole('SALES_AGENT');
    }

    public function isTbl(): bool
    {
        return $this->hasRole('TBL');
    }

    public function isBranchOwner(): bool
    {
        return $this->hasRole('BRANCH_OWNER');
    }

    public function hasFullAccess(): bool
    {
        return $this->isAdministrator() || $this->isManager();
    }

    public function assignRole($role): void
    {
        $roleId = $role instanceof Role ? $role->id : $role;
        $this->update(['role_id' => $roleId]);
    }

    public function syncRoles(array $roles): void
    {
        if (count($roles) > 0) {
            $this->assignRole($roles[0]);
        }
    }

    // For backward compatibility: return a collection with one role
    public function getRolesAttribute()
    {
        return $this->role ? collect([$this->role]) : collect();
    }

    // ========== PERMISSION CHECK ==========
    public function hasPermission($permission): bool
    {
        if ($this->hasFullAccess()) return true;
        if (is_string($permission)) {
            if ($this->permissions->contains('name', $permission)) return true;
            return $this->role && $this->role->permissions->contains('name', $permission);
        }
        return !!$permission->intersect($this->permissions)->count();
    }

    // ========== GOOGLE USER CHECK ==========
    public function isGoogleUser(): bool
    {
        return !is_null($this->google_id);
    }

    // ========== PASSWORD METHODS ==========
    public function isPasswordExpired(): bool
    {
        if (!$this->password_changed_at) return true;
        return $this->password_changed_at->diffInDays(Carbon::now()) >= 7;
    }

    public function getPasswordExpiryDaysRemaining(): int
    {
        if (!$this->password_changed_at) return 0;
        $daysUsed = $this->password_changed_at->diffInDays(Carbon::now());
        return max(0, 7 - $daysUsed);
    }

    public function needsPasswordExpiryWarning(): bool
    {
        $daysRemaining = $this->getPasswordExpiryDaysRemaining();
        return $daysRemaining <= 2 && $daysRemaining > 0;
    }

    public function markPasswordExpiryNotified(): self
    {
        $this->password_expiry_notified_at = Carbon::now();
        $this->save();
        return $this;
    }

    public function updatePassword(string $newPassword): void
    {
        PasswordHistory::create([
            'id'       => (string) Str::uuid(),
            'user_id'  => $this->id,
            'password' => $this->password
        ]);

        $this->update([
            'password'                    => Hash::make($newPassword),
            'password_changed_at'         => Carbon::now(),
            'password_expiry_notified_at' => null,
            'login_attempts'              => 0,
            'locked_until'                => null
        ]);
    }

    public function hasUsedPassword(string $password): bool
    {
        $recentPasswords = $this->passwordHistory()
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();
        foreach ($recentPasswords as $old) {
            if (Hash::check($password, $old->password)) return true;
        }
        return false;
    }

    // ========== ACCOUNT LOCK ==========
    public function isLocked(): bool
    {
        if (!$this->locked_until) return false;
        return $this->locked_until->isFuture();
    }

    public function incrementLoginAttempts(): void
    {
        $this->increment('login_attempts');
        if ($this->login_attempts >= 5) {
            $this->update(['locked_until' => Carbon::now()->addMinutes(30)]);
        }
    }

    public function resetLoginAttempts(): void
    {
        $this->update([
            'login_attempts' => 0,
            'locked_until'   => null
        ]);
    }

    // ========== SCOPES ==========
    public function scopeRole($query, $roleName)
    {
        return $query->whereHas('role', function($q) use ($roleName) {
            $q->where('name', $roleName);
        });
    }

    public function getPasswordDaysRemaining()
    {
        return $this->getPasswordExpiryDaysRemaining();
    }

    public function collectionCenter()
{
    return $this->belongsTo(CollectionCenter::class, 'cc_id', 'cc_id');
}
}