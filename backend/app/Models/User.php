<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\SendsNotifications;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, SendsNotifications;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'email',
        'password',
        'user_type',
        'contact_no',
        'emergency_contact_no',
        'address',
        'country',
        'city',
        'guardian_name',
        'guardian_email',
        'guardian_contact_no',
        'picture',
        'fees',
        'expected_fee_promise_date',
        'requested_course',
        'source',
        'block',
        'block_reason',
        'signup_visit_refer',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'expected_fee_promise_date' => 'integer',
            'block' => 'integer', // Cast block to integer to ensure proper comparison
        ];
    }

    /**
     * Get the profile picture URL.
     */
    public function getPictureUrlAttribute(): ?string
    {
        if ($this->picture) {
            return url('/load-storage/' . $this->picture);
        }
        return null;
    }

    /**
     * Get the user type that owns the user (backward compatibility).
     */
    public function userType(): BelongsTo
    {
        return $this->belongsTo(UserType::class, 'user_type');
    }

    /**
     * Get the roles for the user (many-to-many).
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(UserType::class, 'user_roles', 'user_id', 'role_id')
            ->withTimestamps();
    }

    /**
     * Get the batches for the user.
     */
    public function batches(): BelongsToMany
    {
        return $this->belongsToMany(Batch::class, 'user_batches', 'user_id', 'batch_id')
            ->withTimestamps();
    }

    /**
     * Check if user has a specific role.
     */
    public function hasRole($roleId): bool
    {
        return $this->roles()->where('user_types.id', $roleId)->exists();
    }

    /**
     * Check if user has any of the given roles.
     */
    public function hasAnyRole(array $roleIds): bool
    {
        return $this->roles()->whereIn('user_types.id', $roleIds)->exists();
    }

    /**
     * Check if user is admin (has admin role - ID 1).
     */
    public function isAdmin(): bool
    {
        return $this->hasRole(1) || $this->user_type == 1;
    }

    /**
     * Check if user is student (has student role - ID 2).
     */
    public function isStudent(): bool
    {
        return $this->hasRole(2) || $this->user_type == 2;
    }
}
