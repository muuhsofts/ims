export interface AgentCards {
    total_stock: number;
    total_sales_amount: number;
    total_sales_count: number;
    period: string;
}

export interface PieChartItem {
    category: string;
    product_count: number;
}

export interface WeeklySale {
    day: string;
    sales_count: number;
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

export interface ProductStock {
    product_name: string;
    quantity: number;
}

export interface AgentAnalyticsResponse {
    cards: AgentCards;
    pie_chart: PieChartItem[];
    weekly_sales: WeeklySale[];
    top_5_sales: TopSale[];
    product_stock_histogram: ProductStock[];
}