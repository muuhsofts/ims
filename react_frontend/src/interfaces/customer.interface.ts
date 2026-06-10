// types/customer.types.ts

export interface Customer {
    customer_id: string;      // note: primary key is customer_id, not id
    customer_name: string;
    nida: string | null;
    msisdn: string | null;
    email: string | null;
    status: 'active' | 'inactive';
    created_by?: string | null;
    deleted_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CustomerCreatePayload {
    customer_name: string;
    nida?: string | null;
    msisdn?: string | null;
    email?: string | null;
    status?: 'active' | 'inactive';
}

export interface CustomerUpdatePayload extends Partial<CustomerCreatePayload> {}

// Optional: query parameters for listing
export interface CustomerQueryParams {
    status?: 'active' | 'inactive';
    search?: string;
    trashed?: boolean;
    page?: number;
    per_page?: number;
}