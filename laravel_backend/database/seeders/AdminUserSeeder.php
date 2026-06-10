<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    public function run()
    {
        // Get or create ADMINISTRATOR Role
        $adminRole = Role::where('name', 'ADMINISTRATOR')->first();
        if (!$adminRole) {
            $adminRole = Role::create([
                'id'           => (string) Str::uuid(),
                'name'         => 'ADMINISTRATOR',
                'display_name' => 'System Administrator',
                'description'  => 'Full system access',
                'guard_name'   => 'web',
            ]);
            $this->command->info('✅ ADMINISTRATOR Role created.');
        } else {
            $this->command->info('✅ ADMINISTRATOR Role already exists.');
        }

        // Create or update Admin User
        $adminEmail = 'nyemamudhihirsoft01@gmail.com';
        $user = User::where('email', $adminEmail)->first();

        if (!$user) {
            $user = User::create([
                'id'                  => (string) Str::uuid(),
                'name'                => 'System Administrator',
                'email'               => $adminEmail,
                'password'            => Hash::make('Admin@123456'),
                'status'              => 'active',
                'is_active'           => true,
                'email_verified_at'   => now(),
                'password_changed_at' => now(),
                'role_id'             => $adminRole->id,   
            ]);
            $this->command->info('✅ Admin user created.');
        } else {
            // Update existing user with role_id if missing
            if (is_null($user->role_id)) {
                $user->role_id = $adminRole->id;
                $user->save();
                $this->command->info('✅ Admin user role assigned.');
            } else {
                $this->command->info('✅ Admin user already has a role.');
            }
        }

        $this->command->info('🎉 System Administrator setup completed!');
        $this->command->info('Email    : ' . $adminEmail);
        $this->command->info('Password : Admin@123456');
        $this->command->warn('Please change password after first login!');
    }
}