<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationSetting extends Model
{
    use HasFactory;

    protected $table = 'notification_settings';

    protected $fillable = [
        'new_student_registration',
        'block_student_registration',
        'user_update',
        'user_login_logout',
    ];

    protected $casts = [
        'new_student_registration' => 'boolean',
        'block_student_registration' => 'boolean',
        'user_update' => 'boolean',
        'user_login_logout' => 'boolean',
    ];
}

