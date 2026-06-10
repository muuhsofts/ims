import { Role } from './role.interface';

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: 'pending' | 'active' | 'suspended' | 'inactive';
    role_id: string;
    cc_id?: string;
    is_active: boolean;
    created_by: string | null;
    last_login_ip: string | null;
    email_verified_at: string | null;
    last_login_at: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
    address: string | null;
    google_id: string | null;
    google_avatar: string | null;
    password_changed_at: string | null;
    password_expiry_notified_at: string | null;
    login_attempts: number;
    locked_until: string | null;
    two_factor_enabled: boolean;
    two_factor_secret: string | null;
    role?: Role;
    createdBy?: User;
}