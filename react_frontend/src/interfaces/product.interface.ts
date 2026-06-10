export interface Product {
    product_id: string;
    category_id: string;
    sku: string | null;         // new
    imei: string | null;
    buying_price: number;
    selling_price: number;
    status: 'active' | 'inactive' | 'sold' | 'damaged';
    stock_status: 'in_stock' | 'transferred' | 'received' | 'sold' | 'damaged';
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
    category?: {
        category_id: string;
        category_name: string;
        model?: string;
        sku?: string[];   // category's SKU array, not product's
    };
}

export interface ProductFormData {
    category_id: string;
    sku?: string;
    imeis?: string;       // for bulk create
    imei?: string;        // for single update
    buying_price: number;
    selling_price: number;
    status?: 'active' | 'inactive' | 'sold' | 'damaged';
}