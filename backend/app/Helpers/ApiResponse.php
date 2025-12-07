<?php

namespace App\Helpers;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    /**
     * Return a successful JSON response.
     *
     * @param mixed $data
     * @param string $message
     * @param int $statusCode
     * @return JsonResponse
     */
    public static function success($data = null, string $message = 'Success', int $statusCode = 200): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'data' => $data,
            'error' => null,
        ], $statusCode);
    }

    /**
     * Return an error JSON response.
     *
     * @param mixed $error
     * @param string $message
     * @param int $statusCode
     * @return JsonResponse
     */
    public static function error($error = null, string $message = 'An error occurred', int $statusCode = 400): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'data' => null,
            'error' => $error,
        ], $statusCode);
    }

    /**
     * Return a validation error JSON response.
     *
     * @param array $errors
     * @param string $message
     * @return JsonResponse
     */
    public static function validationError(array $errors, string $message = 'Validation failed'): JsonResponse
    {
        return self::error($errors, $message, 422);
    }

    /**
     * Return an unauthorized JSON response.
     *
     * @param string $message
     * @param mixed $error
     * @return JsonResponse
     */
    public static function unauthorized(string $message = 'Unauthorized', $error = null): JsonResponse
    {
        return self::error($error, $message, 401);
    }

    /**
     * Return a not found JSON response.
     *
     * @param string $message
     * @param mixed $error
     * @return JsonResponse
     */
    public static function notFound(string $message = 'Resource not found', $error = null): JsonResponse
    {
        return self::error($error, $message, 404);
    }

    /**
     * Return a forbidden JSON response.
     *
     * @param string $message
     * @param mixed $error
     * @return JsonResponse
     */
    public static function forbidden(string $message = 'Forbidden', $error = null): JsonResponse
    {
        return self::error($error, $message, 403);
    }

    /**
     * Return a server error JSON response.
     *
     * @param string $message
     * @param mixed $error
     * @return JsonResponse
     */
    public static function serverError(string $message = 'Internal server error', $error = null): JsonResponse
    {
        return self::error($error, $message, 500);
    }
}

