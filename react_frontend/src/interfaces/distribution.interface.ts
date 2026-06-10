// src/interfaces/distribution.interface.ts
export interface Distribution {
    distribution_id: string;
    user_id: string;           // sales agent
    cc_id: string;
    product_id: string;
    quantity: number;
    quantity_received: number;
    status: string;            // 'pending', 'completed', 'confirmed'
    performed_by: string;
    approved_by: string;
    received_by: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
    collection_center?: {
        cc_id: string;
        cc_name: string;
        location: string;
    };
    product?: {
        product_id: string;
        imei: string;
        color: string;
        selling_price: number;
        category?: {
            category_id: string;
            category_name: string;
        };
    };
}

export interface DistributionFormData {
    user_id: string;
    product_id: string;
    quantity: number;
    notes?: string;
    cc_id?: string;          // optional – backend will auto‑detect if only one CC owned
}

export interface DistributionQueryParams {
    page?: number;
    per_page?: number;
    user_id?: string;
    cc_id?: string;
    status?: string;
}

export interface AvailableStockItem {
    product_id: string;
    imei: string;
    color: string;
    buying_price: number;
    selling_price: number;
    available_quantity: number;
}