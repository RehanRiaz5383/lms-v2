<?php

namespace App\Mail;

use Illuminate\Contracts\Queue\ShouldQueue;

class UserLogoutMail extends BaseMailable implements ShouldQueue
{
    public $userName;
    public $userEmail;
    public $logoutDate;

    /**
     * Create a new message instance.
     */
    public function __construct(string $userName, string $userEmail, string $logoutDate)
    {
        $this->userName = $userName;
        $this->userEmail = $userEmail;
        $this->logoutDate = $logoutDate;
        $this->headerTitle = 'Account Logout Notification';
        $this->title = 'Logout Notification';
    }

    /**
     * Get the email subject.
     */
    protected function getSubject(): string
    {
        return 'Account Logout Notification - LMS System';
    }

    /**
     * Get the view name.
     */
    protected function getView(): string
    {
        return 'emails.user-logout';
    }

    /**
     * Get the view data.
     */
    protected function getViewData(): array
    {
        return [
            'userName' => $this->userName,
            'userEmail' => $this->userEmail,
            'logoutDate' => $this->logoutDate,
        ];
    }
}

