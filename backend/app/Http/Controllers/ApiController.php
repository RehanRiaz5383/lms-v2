<?php

namespace App\Http\Controllers;

use App\Helpers\ApiResponse;
use Illuminate\Http\JsonResponse;

class ApiController extends Controller
{
    /**
     * Return a successful JSON response.
     *
     * @param mixed $data
     * @param string $message
     * @param int $statusCode
     * @return JsonResponse
     */
    protected function success($data = null, string $message = 'Success', int $statusCode = 200): JsonResponse
    {
        return ApiResponse::success($data, $message, $statusCode);
    }

    /**
     * Return an error JSON response.
     *
     * @param mixed $error
     * @param string $message
     * @param int $statusCode
     * @return JsonResponse
     */
    protected function error($error = null, string $message = 'An error occurred', int $statusCode = 400): JsonResponse
    {
        return ApiResponse::error($error, $message, $statusCode);
    }

    /**
     * Return a validation error JSON response.
     *
     * @param array $errors
     * @param string $message
     * @return JsonResponse
     */
    protected function validationError(array $errors, string $message = 'Validation failed'): JsonResponse
    {
        return ApiResponse::validationError($errors, $message);
    }

    /**
     * Return an unauthorized JSON response.
     *
     * @param string $message
     * @param mixed $error
     * @return JsonResponse
     */
    protected function unauthorized(string $message = 'Unauthorized', $error = null): JsonResponse
    {
        return ApiResponse::unauthorized($message, $error);
    }

    /**
     * Return a not found JSON response.
     *
     * @param string $message
     * @param mixed $error
     * @return JsonResponse
     */
    protected function notFound(string $message = 'Resource not found', $error = null): JsonResponse
    {
        return ApiResponse::notFound($message, $error);
    }

    /**
     * Return a forbidden JSON response.
     *
     * @param string $message
     * @param mixed $error
     * @return JsonResponse
     */
    protected function forbidden(string $message = 'Forbidden', $error = null): JsonResponse
    {
        return ApiResponse::forbidden($message, $error);
    }
}

