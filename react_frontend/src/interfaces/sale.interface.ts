export interface Sale {
    id: string;
    agent_id: string;
    customer_id: string;
    customer_name?: string;
    customer_phone?: string;
    total_amount: number;
    payment_method: 'cash' | 'mpesa' | 'airtel_money' | 'halopesa' | 'mixx_yas' | 'bank_transfer' | 'mixed';
    status: 'pending' | 'completed' | 'cancelled';
    items?: any;
    notes?: string;
    created_at: string;
    updated_at: string;
    agent?: any;
    customer?: any;
    product?: any;
}