<?php

namespace App\Mail;

use Illuminate\Contracts\Queue\ShouldQueue;

class UserLoginMail extends BaseMailable implements ShouldQueue
{
    public $userName;
    public $userEmail;
    public $loginDate;
    public $ipAddress;

    /**
     * Create a new message instance.
     */
    public function __construct(string $userName, string $userEmail, string $loginDate, ?string $ipAddress = null)
    {
        $this->userName = $userName;
        $this->userEmail = $userEmail;
        $this->loginDate = $loginDate;
        $this->ipAddress = $ipAddress;
        $this->headerTitle = 'Account Login Notification';
        $this->title = 'Login Notification';
    }

    /**
     * Get the email subject.
     */
    protected function getSubject(): string
    {
        return 'Account Login Notification - LMS System';
    }

    /**
     * Get the view name.
     */
    protected function getView(): string
    {
        return 'emails.user-login';
    }

    /**
     * Get the view data.
     */
    protected function getViewData(): array
    {
        return [
            'userName' => $this->userName,
            'userEmail' => $this->userEmail,
            'loginDate' => $this->loginDate,
            'ipAddress' => $this->ipAddress,
        ];
    }
}

