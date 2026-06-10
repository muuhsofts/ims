<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    public const HOME = '/home';

    public function boot(): void
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    protected function configureRateLimiting(): void
    {
        // Main API limiter - Very generous in development
        RateLimiter::for('api', function (Request $request) {
            $key = $request->user()?->id ?? $request->ip();

            if (app()->environment('local', 'testing')) {
                return Limit::perMinute(500); // Increased even more
            }

            return Limit::perMinute(60)->by($key);
        });

        // Stricter for public auth
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(20)
                ->by($request->ip())
                ->response(function () {
                    return response()->json([
                        'message' => 'Too many attempts. Please wait a moment before trying again.'
                    ], 429);
                });
        });
    }
}