export interface Receipt {
    id: string;
    receipt_number: string;
    order_id: string;
    customer_name: string;
    customer_phone: string;
    total_amount: number;
    payment_method: string;
    payment_status: 'paid' | 'partial' | 'pending';
    pdf_path: string | null;
    created_by: string;
    created_at: string;
    sale?: any;
    creator?: any;
}