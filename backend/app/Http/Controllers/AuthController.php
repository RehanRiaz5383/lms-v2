<?php

namespace App\Http\Controllers;

use App\Events\StudentLogin;
use App\Events\StudentLogout;
use App\Events\StudentRegistered;
use App\Models\CloudflareTurnstileSettings;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
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

        // Dispatch event for all user types (only once)
        event(new StudentLogin($user));

        // Add picture URL if available
        $pictureUrl = null;
        if ($user->picture) {
            $pictureUrl = url('/load-storage/' . $user->picture);
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
                'block' => $user->block ?? 0,
                'block_reason' => $user->block_reason,
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
        
        // Dispatch event for all user types (only once)
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
        $user->load('userType', 'roles');

        // Add picture URL if available
        $pictureUrl = null;
        if ($user->picture) {
            $pictureUrl = url('/load-storage/' . $user->picture);
        }

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'user_type' => $user->user_type,
            'user_type_title' => $user->userType?->title ?? null,
            'picture' => $user->picture,
            'picture_url' => $pictureUrl,
            'block' => $user->block ?? 0,
            'block_reason' => $user->block_reason,
            'roles' => $user->roles->map(function($role) {
                return [
                    'id' => $role->id,
                    'title' => $role->title,
                ];
            }),
        ], 'User retrieved successfully');
    }

    /**
     * Handle user signup.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function signup(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8',
                'source' => 'nullable|string|max:255', // From where student know about us
                'turnstile_token' => 'nullable|string', // Cloudflare Turnstile token
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        // Check if Cloudflare Turnstile is enabled
        $turnstileSettings = CloudflareTurnstileSettings::getSettings();
        
        if ($turnstileSettings->is_enabled) {
            // Verify Turnstile token
            if (!$request->has('turnstile_token') || empty($request->input('turnstile_token'))) {
                return $this->error('Turnstile verification is required', 'Please complete the security verification', 400);
            }

            // Verify the token with Cloudflare
            $verificationResult = $this->verifyTurnstileToken(
                $request->input('turnstile_token'),
                $turnstileSettings->secret_key
            );

            if (!$verificationResult['success']) {
                return $this->error('Turnstile verification failed', $verificationResult['message'] ?? 'Security verification failed', 400);
            }
        }

        // Create user with student role (user_type = 2) and set as blocked
        $user = User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'password' => Hash::make($request->input('password')),
            'user_type' => 2, // Student
            'source' => $request->input('source'),
            'block' => 1, // Block new signups by default
            'block_reason' => 'Account need activation from Administration',
        ]);

        // Assign student role
        $user->roles()->sync([2]);

        // Load relationships
        $user->load('userType', 'roles');

        // Dispatch StudentRegistered event
        event(new StudentRegistered($user));

        // Create a token for immediate login
        $token = $user->createToken('auth-token')->plainTextToken;

        return $this->success([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'user_type' => $user->user_type,
                'user_type_title' => $user->userType?->title ?? null,
                'block' => $user->block ?? 0,
                'block_reason' => $user->block_reason,
                'roles' => $user->roles->map(function($role) {
                    return [
                        'id' => $role->id,
                        'title' => $role->title,
                    ];
                }),
            ],
            'token' => $token,
        ], 'Signup successful', 201);
    }

    /**
     * Verify Cloudflare Turnstile token.
     *
     * @param string $token
     * @param string $secretKey
     * @return array
     */
    private function verifyTurnstileToken(string $token, string $secretKey): array
    {
        try {
            $response = Http::asForm()->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret' => $secretKey,
                'response' => $token,
            ]);

            $result = $response->json();

            if (isset($result['success']) && $result['success'] === true) {
                return ['success' => true];
            }

            return [
                'success' => false,
                'message' => $result['error-codes'][0] ?? 'Verification failed',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to verify token: ' . $e->getMessage(),
            ];
        }
    }
}

