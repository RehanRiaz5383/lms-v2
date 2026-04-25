<?php

namespace App\Services;

use App\Models\User;

class NavPermissionService
{
    /**
     * All distinct nav permission slugs granted to the user through any assigned role.
     */
    public static function slugsForUser(User $user): array
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('nav_permissions')
            || ! \Illuminate\Support\Facades\Schema::hasTable('user_type_nav_permission')) {
            return [];
        }

        $user->loadMissing('roles.navPermissions');

        return $user->roles
            ->flatMap(fn ($role) => $role->navPermissions)
            ->pluck('slug')
            ->unique()
            ->values()
            ->all();
    }

    public static function has(User $user, string $slug): bool
    {
        return in_array($slug, self::slugsForUser($user), true);
    }

    /**
     * @param list<string> $slugs
     */
    public static function hasAny(User $user, array $slugs): bool
    {
        $granted = self::slugsForUser($user);
        foreach ($slugs as $slug) {
            if (in_array($slug, $granted, true)) {
                return true;
            }
        }
        return false;
    }

    public static function canAccessAdminPanel(User $user): bool
    {
        if ((int) $user->user_type === 1) {
            return true;
        }

        $user->loadMissing('roles');

        if ($user->roles->contains('id', 1)) {
            return true;
        }

        if ($user->roles->contains(fn ($r) => strtolower(trim((string) $r->title)) === 'admin')) {
            return true;
        }

        foreach (self::slugsForUser($user) as $slug) {
            if (str_starts_with((string) $slug, 'admin.')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Primary platform administrator — only user_type Admin or explicit Admin role (id 1).
     * Used for role / permission catalog management APIs.
     */
    public static function isPrimaryPlatformAdmin(User $user): bool
    {
        if ((int) $user->user_type === 1) {
            return true;
        }

        $user->loadMissing('roles');

        return $user->roles->contains('id', 1);
    }
}
