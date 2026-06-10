export interface OTP {
    id: string;
    email: string;
    otp: string;
    type: 'registration' | 'password_reset' | 'email_verification' | 'login';
    name: string | null;
    token: string;
    user_data?: any;
    expires_at: string;
    is_used: boolean;
    created_at: string;
    updated_at: string;
    ip_address: string | null;
    user_agent: string | null;
    attempts: number;
    last_request_at: string | null;
}