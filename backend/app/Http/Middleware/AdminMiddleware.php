<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
                'data' => null,
                'error' => ['access' => ['You do not have permission to access this resource.']],
            ], 403);
        }

        // Admin: user_type 1, role id 1, or role title "admin" (installations vary; must match Inbox UI)
        $isAdmin = $user->user_type == 1
            || $user->hasRole(1)
            || $user->roles()->whereRaw('LOWER(user_types.title) = ?', ['admin'])->exists();

        if (!$isAdmin) {
            return response()->json([
                'message' => 'Unauthorized. Admin access required.',
                'data' => null,
                'error' => ['access' => ['You do not have permission to access this resource.']],
            ], 403);
        }

        return $next($request);
    }
}

