// src/interfaces/warehouse.ts
export interface Warehouse {
    warehouse_id: string;
    name: string;
    location: string | null;
    manager_id: string | null;
    status: 'active' | 'inactive' | 'maintenance';
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
    manager?: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        status: string;
        role?: any;
    };
}

export interface WarehouseFormData {
    name: string;
    location?: string;
    manager_id?: string;
    status?: 'active' | 'inactive' | 'maintenance';
}

export interface WarehouseQueryParams {
    page?: number;
    per_page?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'maintenance';
    trashed?: boolean;
}