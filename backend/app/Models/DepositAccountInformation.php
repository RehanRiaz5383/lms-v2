<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DepositAccountInformation extends Model
{
    protected $table = 'deposit_account_informations';

    protected $fillable = [
        'content_html',
        'updated_by_user_id',
    ];
}

