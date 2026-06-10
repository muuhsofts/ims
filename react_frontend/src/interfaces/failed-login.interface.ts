export interface FailedLogin {
    id: string;
    email: string;
    ip_address: string;
    attempt_count: number;
    last_attempt_at: string;
}