<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserType extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
    ];

    /**
     * Get the users for this user type (one-to-many - backward compatibility).
     */
    public function users()
    {
        return $this->hasMany(User::class, 'user_type');
    }

    /**
     * Get the users that have this role (many-to-many).
     */
    public function usersWithRole(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_roles', 'role_id', 'user_id')
            ->withTimestamps();
    }
}

