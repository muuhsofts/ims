// src/interfaces/collection-center-inventory.interface.ts

export interface CcInventory {
    cc_inventory_id: string;
    cc_id: string;
    product_ids: string[];
    quantity: number;
    created_at: string;
    updated_at: string;
    collection_center?: {
        cc_id: string;
        cc_name: string;
        location: string;
        owner_id?: string;
        status?: string;
    };
    products?: {
        product_id: string;
        category_id: string;
        imei: string;
        color: string | null;
        buying_price: number;
        selling_price: number;
        status: string;
        stock_status: string;
        category?: {
            category_id: string;
            category_name: string;
            model?: string;
            sku?: string;
        };
    }[];
}

export interface CcInventoryFormData {
    cc_id: string;
    product_ids: string[];
}

export interface CcInventoryQueryParams {
    page?: number;
    per_page?: number;
    search?: string;
    cc_id?: string;
}