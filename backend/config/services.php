<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
    'google' => [
        'client_id'     => env('GOOGLE_DRIVE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_DRIVE_CLIENT_SECRET'),
        'refresh_token' => env('GOOGLE_DRIVE_REFRESH_TOKEN'),
        'api_key'       => env('GOOGLE_DRIVE_API_KEY'), // Optional for this flow
        'folders' => [
            'user_profile' => env('GOOGLE_DRIVE_FOLDER_USER_PROFILE', '1vKLAY4Yc3LSs8a9Mcn7DWn2gVGCuxbjF'),
            'task_files' => env('GOOGLE_DRIVE_FOLDER_TASK_FILES', ''), // Add folder ID here
            'submitted_tasks' => env('GOOGLE_DRIVE_FOLDER_SUBMITTED_TASKS', ''), // Add folder ID here
            'voucher_submissions' => env('GOOGLE_DRIVE_FOLDER_VOUCHER_SUBMISSIONS', ''), // Add folder ID here
        ],
    ],

];
