<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class NavPermission extends Model
{
    protected $fillable = [
        'slug',
        'label',
        'route_path',
        'audience',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function userTypes(): BelongsToMany
    {
        return $this->belongsToMany(UserType::class, 'user_type_nav_permission', 'nav_permission_id', 'user_type_id')
            ->withTimestamps();
    }
}
