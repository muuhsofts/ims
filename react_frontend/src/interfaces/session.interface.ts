export interface UserSession {
    id: string;
    user_id: string;
    token: string;
    ip_address: string;
    user_agent: string;
    device_name: string;
    last_activity: string;
    is_active: boolean;
    expires_at: string;
    created_at: string;
    updated_at: string;
}