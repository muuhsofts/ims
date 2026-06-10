// src/interfaces/supplier.ts
export interface Supplier {
    supplier_id: string;
    supplier_name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    status: 'active' | 'inactive' | 'suspended';
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface SupplierFormData {
    supplier_name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    status?: 'active' | 'inactive' | 'suspended';
}

export interface SupplierQueryParams {
    page?: number;
    per_page?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'suspended';
    trashed?: boolean;
}