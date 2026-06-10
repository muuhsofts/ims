// src/interfaces/transfer-request.ts
export interface TransferRequest {
    request_id: string;
    requester_id: string;
    cc_id: string;
    warehouse_id: string | null;
    requested_items: RequestedItem[];
    total_quantity: number;
    received_quantity: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    approved_by: string | null;
    approved_at: string | null;
    received_by: string | null;
    received_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    requester?: {
        id: string;
        name: string;
        email: string;
    };
    collection_center?: {      // ✅ snake_case matches API
        cc_id: string;
        cc_name: string;
        location: string;
    };
    approver?: any;
    receiver?: any;
    movements?: any[];
}

export interface RequestedItem {
    category_name: string;
    model?: string;
    sku?: string;
    description?: string;
}

export interface TransferRequestFormData {
    cc_id: string;
    requested_items: RequestedItem[];
    notes?: string;
}

export interface TransferRequestQueryParams {
    page?: number;
    per_page?: number;
    status?: string;
    cc_id?: string;
}