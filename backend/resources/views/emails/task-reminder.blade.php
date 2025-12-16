@extends('emails.layout')

@section('content')
    <h2>Task Reminder</h2>
    
    <p>Dear {{ $studentName }},</p>
    
    <p>This is a friendly reminder that you have a task approaching its deadline.</p>
    
    <div class="highlight-box">
        <strong>📋 Task Details</strong>
        <div class="info-item">
            <strong>Task:</strong> {{ $taskTitle }}
        </div>
        <div class="info-item">
            <strong>⏰ Time Remaining:</strong> {{ $reminderHours }} hours
        </div>
        <div class="info-item">
            <strong>📅 Due Date:</strong> {{ $formattedDate }}
        </div>
    </div>
    
    <p>Please make sure to submit your task before the deadline to avoid any penalties.</p>
    
    <p style="margin-top: 25px;">Best regards,<br>
    <strong>LMS System</strong><br>
    Tech Inn Solutions</p>
@endsection
