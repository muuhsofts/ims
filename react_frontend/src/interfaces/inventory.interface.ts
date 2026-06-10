// src/interfaces/inventory.ts
export interface Inventory {
    inventory_id: string;
    product_ids: string[];
    warehouse_id: string;
    quantity: number;
    created_by: string;
    created_at: string;
    updated_at: string;
    warehouse?: {
        warehouse_id: string;
        name: string;
        location: string;
    };
    products?: {
        product_id: string;
        imei: string;
        color: string;
        selling_price: number;
        category?: any;
    }[];
    created_by_user?: {
        id: string;
        name: string;
    };
}

export interface InventoryFormData {
    product_ids: string[];
    warehouse_id: string;
}

export interface InventoryQueryParams {
    page?: number;
    per_page?: number;
    search?: string;
    warehouse_id?: string;
}