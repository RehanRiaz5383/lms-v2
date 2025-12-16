@extends('emails.layout')

@section('content')
    <h2>Account Login Notification</h2>
    
    <p>Hello {{ $userName }},</p>
    
    <p>Your account has been successfully logged in to the LMS System.</p>
    
    <div class="highlight-box">
        <strong>🔐 Login Details</strong>
        <div class="info-item">
            <strong>Name:</strong> {{ $userName }}
        </div>
        <div class="info-item">
            <strong>Email:</strong> {{ $userEmail }}
        </div>
        <div class="info-item">
            <strong>Login Date & Time:</strong> {{ $loginDate }}
        </div>
        @if($ipAddress)
        <div class="info-item">
            <strong>IP Address:</strong> {{ $ipAddress }}
        </div>
        @endif
    </div>
    
    <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
        <strong>⚠️ Security Notice:</strong> If you did not perform this login, please secure your account immediately by changing your password and contacting support.
    </p>
    
    <p style="margin-top: 25px;">Best regards,<br>
    <strong>LMS System</strong><br>
    Tech Inn Solutions</p>
@endsection

