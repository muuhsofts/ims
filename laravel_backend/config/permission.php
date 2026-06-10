<?php

return [

    'models' => [
        'permission' => App\Models\Permission::class,
        'role'       => App\Models\Role::class,
    ],

    'table_names' => [
        'roles'                 => 'roles',
        'permissions'           => 'permissions',
        'model_has_permissions' => 'permission_user',     // Your custom pivot
        'model_has_roles'       => 'role_user',           // Your custom pivot
        'role_has_permissions'  => 'permission_role',
    ],

    'column_names' => [
        'model_morph_key' => 'model_id',
        'team_foreign_key' => 'team_id',
    ],

    'register_permission_check_method' => true,
    'teams' => false,
    'use_cache' => true,

    'cache' => [
        'expiration_time' => \DateInterval::createFromDateString('24 hours'),
        'key' => 'spatie.permission.cache',
        'store' => 'default',
    ],
];