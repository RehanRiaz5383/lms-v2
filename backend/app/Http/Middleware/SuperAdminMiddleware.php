<?php

namespace App\Http\Middleware;

use App\Services\NavPermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    /**
     * Primary admin only (role id 1 / user_type 1) — role & permission catalog management.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! NavPermissionService::isPrimaryPlatformAdmin($user)) {
            return response()->json([
                'message' => 'Forbidden. Only the primary administrator can manage roles and permissions.',
                'data' => null,
                'error' => ['access' => ['Insufficient privileges.']],
            ], 403);
        }

        return $next($request);
    }
}
