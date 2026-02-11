<?php

use App\Helpers\ApiResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
        ]);
        
        // Enable CORS for API routes
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Ensure API routes return JSON responses
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) {
            return $request->is('api/*') || $request->expectsJson();
        });

        // Format validation exceptions for API routes (must be first to catch ValidationException)
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::validationError($e->errors(), 'Validation failed');
            }
        });

        // Format HTTP exceptions for API routes
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $statusCode = $e->getStatusCode();
                $message = $e->getMessage() ?: 'An error occurred';
                
                return ApiResponse::error(null, $message, $statusCode);
            }
        });

        // Format authentication exceptions for API routes
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            // Always return JSON for API routes (check this first to prevent redirect attempts)
            if ($request->is('api/*')) {
                return ApiResponse::unauthorized('Unauthenticated');
            }
            // For JSON requests, return JSON
            if ($request->expectsJson()) {
                return ApiResponse::unauthorized('Unauthenticated');
            }
            // For web routes, try to redirect to login if route exists
            try {
                if (\Illuminate\Support\Facades\Route::has('login')) {
                    return redirect()->route('login');
                }
            } catch (\Exception $routeException) {
                // If login route doesn't exist, return 401 JSON response
            }
            // Fallback: return 401 JSON response
            return ApiResponse::unauthorized('Unauthenticated');
        });

        // Format other exceptions for API routes
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $statusCode = 500;
                $message = 'An error occurred';
                
                // Don't expose internal errors in production
                $error = config('app.debug') ? [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => explode("\n", $e->getTraceAsString()),
                ] : null;

                if (config('app.debug')) {
                    $message = $e->getMessage() ?: 'An error occurred';
                }

                return ApiResponse::error($error, $message, $statusCode);
            }
        });
    })->create();
