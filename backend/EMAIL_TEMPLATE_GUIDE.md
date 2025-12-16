# Email Template Guide

This guide explains how to use the beautiful email template system for all emails in the LMS.

## Overview

All emails in the system use a unified, beautiful HTML template located at `resources/views/emails/layout.blade.php`. This ensures consistent branding and a professional appearance across all email communications.

## Creating a New Email

### Step 1: Create a Mailable Class

Extend the `BaseMailable` class to automatically use the template:

```php
<?php

namespace App\Mail;

use Illuminate\Contracts\Queue\ShouldQueue;

class YourEmailMail extends BaseMailable implements ShouldQueue
{
    public $data1;
    public $data2;

    public function __construct($data1, $data2)
    {
        $this->data1 = $data1;
        $this->data2 = $data2;
        $this->headerTitle = 'Your Email Title'; // Optional: custom header
        $this->title = 'Your Email Title'; // Optional: custom title
    }

    protected function getSubject(): string
    {
        return "Your Email Subject";
    }

    protected function getView(): string
    {
        return 'emails.your-email';
    }

    protected function getViewData(): array
    {
        return [
            'data1' => $this->data1,
            'data2' => $this->data2,
        ];
    }
}
```

### Step 2: Create the Email View

Create a new Blade view at `resources/views/emails/your-email.blade.php`:

```blade
@extends('emails.layout')

@section('content')
    <h2>Your Email Heading</h2>
    
    <p>Dear {{ $recipientName }},</p>
    
    <p>Your email content goes here...</p>
    
    <div class="highlight-box">
        <strong>Important Information</strong>
        <div class="info-item">
            <strong>Field 1:</strong> {{ $data1 }}
        </div>
        <div class="info-item">
            <strong>Field 2:</strong> {{ $data2 }}
        </div>
    </div>
    
    <p>Additional content...</p>
    
    <!-- Optional: Add a button -->
    <div style="text-align: center;">
        <a href="{{ $actionUrl }}" class="button">Take Action</a>
    </div>
    
    <p style="margin-top: 25px;">Best regards,<br>
    <strong>LMS System</strong><br>
    Tech Inn Solutions</p>
@endsection
```

### Step 3: Send the Email

```php
use App\Mail\YourEmailMail;
use Illuminate\Support\Facades\Mail;

// Queue the email (recommended)
Mail::to($user->email)->queue(new YourEmailMail($data1, $data2));

// Or send immediately
Mail::to($user->email)->send(new YourEmailMail($data1, $data2));
```

## Available CSS Classes

### Highlight Box
Use for important information:
```blade
<div class="highlight-box">
    <strong>Title</strong>
    <div class="info-item">
        <strong>Label:</strong> Value
    </div>
</div>
```

### Buttons
```blade
<!-- Primary button (default) -->
<a href="#" class="button">Primary Action</a>

<!-- Secondary button -->
<a href="#" class="button button-secondary">Secondary Action</a>

<!-- Success button -->
<a href="#" class="button button-success">Success Action</a>

<!-- Danger button -->
<a href="#" class="button button-danger">Danger Action</a>
```

## Template Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Modern Gradient Header**: Eye-catching purple gradient with decorative wave
- **Professional Styling**: Clean, modern design with proper spacing
- **Brand Consistency**: All emails use Tech Inn Solutions branding
- **Email Client Compatibility**: Tested for major email clients (Gmail, Outlook, Apple Mail, etc.)

## Examples

### Task Reminder Email
See `App\Mail\TaskReminderMail` and `resources/views/emails/task-reminder.blade.php` for a complete example.

## Customization

To customize the template globally, edit `resources/views/emails/layout.blade.php`. Changes will apply to all emails using this template.

### Changing Colors

The template uses a purple gradient theme. To change colors, update these CSS variables in the layout:

- Primary gradient: `#667eea` to `#764ba2`
- Text color: `#333333`
- Footer background: `#f8f9fa`

## Best Practices

1. **Always use BaseMailable**: Extend `BaseMailable` for automatic template integration
2. **Queue emails**: Use `ShouldQueue` interface for better performance
3. **Keep content concise**: Emails should be scannable and to the point
4. **Use highlight boxes**: For important information that needs attention
5. **Test before sending**: Always preview emails in different email clients

