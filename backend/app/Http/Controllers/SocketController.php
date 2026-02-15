<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SocketController extends ApiController
{
    /**
     * Get socket server configuration
     * Returns the Socket.IO server URL for the frontend
     *
     * @return JsonResponse
     */
    public function getConfig(): JsonResponse
    {
        $socketUrl = env('SOCKET_URL', 'http://localhost:8080');
        
        return $this->success([
            'socket_url' => $socketUrl,
            'enabled' => env('SOCKET_ENABLED', true),
        ], 'Socket configuration retrieved');
    }

    /**
     * Verify socket authentication token
     * This endpoint is used by the Socket.IO server to verify tokens
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function verifyToken(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return $this->unauthorized('Invalid token');
        }

        // Load user relationships
        $user->load('userType', 'roles');

        // Trigger picture_url accessor
        if ($user->picture) {
            $user->picture_url;
        }

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'user_type' => $user->user_type,
            'user_type_title' => $user->userType?->title ?? null,
            'picture' => $user->picture,
            'picture_url' => $user->picture_url,
            'block' => $user->block ?? 0,
            'roles' => $user->roles->map(function($role) {
                return [
                    'id' => $role->id,
                    'title' => $role->title,
                ];
            }),
        ], 'Token verified');
    }
}

