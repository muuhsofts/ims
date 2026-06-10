export interface StockMovement {
    id: string;
    request_id: string | null;
    product_id: string;
    from_type: 'warehouse' | 'collection_center' | 'sales_agent';
    from_id: string;
    to_type: 'warehouse' | 'collection_center' | 'sales_agent';
    to_id: string;
    quantity: number;
    movement_type: 'purchase' | 'transfer' | 'sale' | 'return' | 'adjustment' | 'loss';
    reference_id: string | null;
    notes: string | null;
    performed_by: string;
    created_at: string;
    product?: any;
    performer?: any;
}