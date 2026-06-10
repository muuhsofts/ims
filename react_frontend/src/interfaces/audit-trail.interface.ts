export interface AuditTrail {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    user_role: string;
    action: string;
    action_type: string;
    module: string;
    description: string;
    old_data: any;
    new_data: any;
    ip_address: string;
    user_agent: string;
    response_status: number | null;
    execution_time_ms: number | null;
    request_method: string;
    request_url: string;
    created_at: string;
    updated_at: string;
}