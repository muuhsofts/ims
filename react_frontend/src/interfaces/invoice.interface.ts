export interface Invoice {
    receipt_id: string;
    receipt_number: string;
    order_id: string | null;
    customer_name: string;
    customer_phone: string | null;
    total_amount: number;
    payment_method: string;
    payment_status: 'paid' | 'pending' | 'failed';
    pdf_path: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    sale?: {
        sale_id: string;
        agent_id: string;
        customer_id: string;
        total_amount: number;
        status: string;
    };
    creator?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface InvoiceQueryParams {
    page?: number;
    per_page?: number;
    search?: string;
    payment_status?: string;
    date_from?: string;
    date_to?: string;
}