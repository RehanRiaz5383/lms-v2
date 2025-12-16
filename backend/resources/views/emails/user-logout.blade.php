@extends('emails.layout')

@section('content')
    <h2>Account Logout Notification</h2>
    
    <p>Hello {{ $userName }},</p>
    
    <p>Your account has been successfully logged out from the LMS System.</p>
    
    <div class="highlight-box">
        <strong>👋 Logout Details</strong>
        <div class="info-item">
            <strong>Name:</strong> {{ $userName }}
        </div>
        <div class="info-item">
            <strong>Email:</strong> {{ $userEmail }}
        </div>
        <div class="info-item">
            <strong>Logout Date & Time:</strong> {{ $logoutDate }}
        </div>
    </div>
    
    <p>Thank you for using our system. We hope to see you again soon!</p>
    
    <p style="margin-top: 25px;">Best regards,<br>
    <strong>LMS System</strong><br>
    Tech Inn Solutions</p>
@endsection

