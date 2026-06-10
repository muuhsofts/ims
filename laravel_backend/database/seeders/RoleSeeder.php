<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'ADMINISTRATOR', 'display_name' => 'Administrator', 'description' => 'Full system access'],
            ['name' => 'MANAGER', 'display_name' => 'Manager', 'description' => 'Manage operations and reports'],
            ['name' => 'STOCK_CONTROLLER', 'display_name' => 'Stock Controller', 'description' => 'Manage inventory and stock movements'],
            ['name' => 'SALES_AGENT', 'display_name' => 'Sales Agent', 'description' => 'Handle sales and customer transactions'],
            ['name' => 'TBL', 'display_name' => 'TBL', 'description' => 'Collection Center'],
            ['name' => 'BRANCH_OWNER', 'display_name' => 'Branch Owner', 'description' => 'Owner of a branch or collection center'],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(
                ['name' => $role['name']],
                [
                    'id'           => (string) Str::uuid(),
                    'display_name' => $role['display_name'],
                    'description'  => $role['description'],
                    'guard_name'   => 'web',
                ]
            );
        }
    }
}