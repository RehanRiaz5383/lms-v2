<?php

namespace App\Http\Controllers;

use App\Models\NavPermission;
use App\Models\UserType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RolePermissionController extends ApiController
{
    public function listPermissions(): JsonResponse
    {
        $rows = NavPermission::query()
            ->orderBy('audience')
            ->orderBy('sort_order')
            ->orderBy('label')
            ->get(['id', 'slug', 'label', 'route_path', 'audience', 'sort_order']);

        return $this->success($rows, 'Nav permissions');
    }

    public function indexRoles(): JsonResponse
    {
        $roles = UserType::query()
            ->withCount('navPermissions')
            ->withCount('usersWithRole')
            ->orderBy('is_system', 'desc')
            ->orderBy('id')
            ->get();

        return $this->success($roles, 'Roles');
    }

    public function showRole(int $id): JsonResponse
    {
        $role = UserType::query()
            ->with(['navPermissions:id,slug,label,route_path,audience'])
            ->find($id);

        if (! $role) {
            return $this->notFound('Role not found');
        }

        return $this->success($role, 'Role');
    }

    public function storeRole(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $slug = Str::slug($data['title']);
        if ($slug === '') {
            $slug = 'role-'.Str::lower(Str::random(8));
        }
        $base = $slug;
        $i = 1;
        while (UserType::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i;
            $i++;
        }

        $role = UserType::query()->create([
            'title' => $data['title'],
            'slug' => $slug,
            'is_system' => false,
        ]);

        return $this->success($role->fresh(), 'Role created');
    }

    public function updateRole(Request $request, int $id): JsonResponse
    {
        $role = UserType::query()->find($id);
        if (! $role) {
            return $this->notFound('Role not found');
        }

        $data = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        if ($role->is_system) {
            $role->update(['title' => $data['title']]);
        } else {
            $slug = Str::slug($data['title']);
            if ($slug === '') {
                $slug = $role->slug;
            }
            $base = $slug;
            $i = 1;
            while (UserType::query()->where('slug', $slug)->where('id', '!=', $role->id)->exists()) {
                $slug = $base.'-'.$i;
                $i++;
            }
            $role->update([
                'title' => $data['title'],
                'slug' => $slug,
            ]);
        }

        return $this->success($role->fresh(), 'Role updated');
    }

    public function destroyRole(int $id): JsonResponse
    {
        $role = UserType::query()->find($id);
        if (! $role) {
            return $this->notFound('Role not found');
        }

        if ($role->is_system) {
            return $this->error(null, 'System roles cannot be deleted', 422);
        }

        if ($role->usersWithRole()->count() > 0) {
            return $this->error(null, 'Remove this role from all users before deleting it', 422);
        }

        $role->delete();

        return $this->success(null, 'Role deleted');
    }

    public function syncRolePermissions(Request $request, int $id): JsonResponse
    {
        $role = UserType::query()->find($id);
        if (! $role) {
            return $this->notFound('Role not found');
        }

        $data = $request->validate([
            'slugs' => 'required|array',
            'slugs.*' => 'required|string|max:128',
        ]);

        $ids = NavPermission::query()->whereIn('slug', $data['slugs'])->pluck('id')->all();
        if (count($ids) !== count(array_unique($data['slugs']))) {
            throw ValidationException::withMessages([
                'slugs' => ['One or more permission slugs are invalid.'],
            ]);
        }

        $role->navPermissions()->sync($ids);

        return $this->success($role->load('navPermissions'), 'Permissions updated');
    }
}
