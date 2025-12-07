<?php

namespace App\Http\Controllers;

use App\Events\StudentLogin;
use App\Events\StudentLogout;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends ApiController
{
    /**
     * Handle user login.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function login(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required|string',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return $this->unauthorized('Invalid credentials', [
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke all existing tokens for this user (optional - for single device login)
        // $user->tokens()->delete();

        // Create a new token for the user
        $token = $user->createToken('auth-token')->plainTextToken;

        // Load user type and roles relationships
        $user->load('userType', 'roles');

        // Dispatch event for all user types
        event(new StudentLogin($user));

        // Add picture URL if available
        $pictureUrl = null;
        if ($user->picture) {
            $pictureUrl = url('/storage/' . $user->picture);
        }

        return $this->success([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'user_type' => $user->user_type,
                'user_type_title' => $user->userType?->title ?? null,
                'picture' => $user->picture,
                'picture_url' => $pictureUrl,
                'roles' => $user->roles->map(function($role) {
                    return [
                        'id' => $role->id,
                        'title' => $role->title,
                    ];
                }),
            ],
            'token' => $token,
        ], 'Login successful');
    }

    /**
     * Handle user logout.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('roles');
        
        // Dispatch event for all user types
        event(new StudentLogout($user));

        // Revoke the current access token
        $user->currentAccessToken()->delete();

        return $this->success(null, 'Logout successful');
    }

    /**
     * Get the authenticated user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('userType');

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'user_type' => $user->user_type,
            'user_type_title' => $user->userType?->title ?? null,
        ], 'User retrieved successfully');
    }
}

