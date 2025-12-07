<?php

namespace App\Providers;

use App\Events\StudentBlocked;
use App\Events\StudentLogin;
use App\Events\StudentLogout;
use App\Events\StudentRegistered;
use App\Events\UserUpdated;
use App\Listeners\SendStudentBlockedNotification;
use App\Listeners\SendUserLoginLogoutNotification;
use App\Listeners\SendStudentRegistrationNotification;
use App\Listeners\SendUserUpdateNotification;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register event listeners
        Event::listen(
            StudentRegistered::class,
            SendStudentRegistrationNotification::class
        );

        Event::listen(
            StudentBlocked::class,
            SendStudentBlockedNotification::class
        );

        Event::listen(
            UserUpdated::class,
            SendUserUpdateNotification::class
        );

        Event::listen(
            StudentLogin::class,
            [SendUserLoginLogoutNotification::class, 'handleLogin']
        );

        Event::listen(
            StudentLogout::class,
            [SendUserLoginLogoutNotification::class, 'handleLogout']
        );
    }
}
