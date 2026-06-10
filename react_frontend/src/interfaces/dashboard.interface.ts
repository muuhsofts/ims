// Card metrics (original)
export interface DashboardCards {
    total_users: number;
    total_customers: number;
    total_suppliers: number;
    total_products: number;
    total_categories: number;
    inventory_level: number;
    period?: string;
    purchases_count?: number;
    purchases_total?: number;
    sales_count?: number;
    sales_total?: number;
}

// Extended analytics
export interface ExtendedAnalytics {
    agent_inventory: {
        total_quantity: number;
        records_count: number;
    };
    collection_center_inventory: {
        total_quantity: number;
        records_count: number;
    };
    stock_distributions: {
        total_quantity: number;
        pending_count: number;
        completed_count: number;
    };
    stock_movements: {
        total_movements: number;
    };
    transfer_requests: {
        total_requests: number;
        pending_requests: number;
        completed_requests: number;
    };
}

// Pie chart item
export interface PieChartItem {
    category: string;
    product_count: number;
}

export interface TopPurchase {
    purchase_id: string;
    supplier_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    status: string;
    created_at: string;
}

export interface TopSale {
    sale_id: string;
    customer_name: string;
    customer_phone: string;
    total_amount: number;
    payment_method: string;
    status: string;
    created_at: string;
}

export interface ProductItem {
    product_id: string;
    imei: string;
    color: string;
    buying_price: number;
    selling_price: number;
    stock_status: string;
}

export interface CategoryProducts {
    category: string;
    count: number;
    products: ProductItem[];
}

export interface DashboardAnalyticsResponse {
    cards: DashboardCards;
    extended_analytics: ExtendedAnalytics;
    pie_chart: PieChartItem[];
    top_5_purchases: TopPurchase[];
    top_5_sales_with_customers: TopSale[];
    products_by_category: CategoryProducts[];
    weekly_sales?: { day: string; sales_count: number }[];
}