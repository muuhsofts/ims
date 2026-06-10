export interface Purchase {
    purchase_id: string;
    supplier_id: string;
    category_id: string;
    quantity_ordered: number;
    unit_price: number;
    subtotal: number;
    selected_skus?: string[];     // <-- added
    status: 'pending' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
    supplier?: {
        supplier_id: string;
        supplier_name: string;
        contact_person?: string;
        phone?: string;
        email?: string;
    };
    category?: {
        category_id: string;
        category_name: string;
        model?: string;
    };
}

export interface PurchaseFormData {
    supplier_id: string;
    category_id: string;
    selected_skus: string[];      // <-- added
    quantity_ordered: number;
    unit_price: number;
    subtotal: number;
    status?: 'pending' | 'completed' | 'cancelled';
}