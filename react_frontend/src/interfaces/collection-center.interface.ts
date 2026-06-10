// src/interfaces/collection-center.ts
export interface CollectionCenter {
    cc_id: string;
    cc_name: string;
    location: string | null;
    owner_id: string;
    status: 'active' | 'inactive' | 'on_maintenance';
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
    owner?: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        status: string;
        role?: any;
    };
}

export interface CollectionCenterFormData {
    cc_name: string;
    location?: string;
    owner_id?: string;
    status?: 'active' | 'inactive' | 'on_maintenance';
}

export interface CollectionCenterQueryParams {
    page?: number;
    per_page?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'on_maintenance';
    trashed?: boolean;
}