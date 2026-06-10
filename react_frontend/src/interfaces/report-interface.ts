// ==================== Base Response Types ====================

interface BaseResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    errors?: any;
}

// ==================== Stock Report Types ====================

interface Warehouse {
    warehouse_id?: number;
    name?: string;
    // Add other warehouse properties as needed
}

interface CollectionCenter {
    cc_id?: number;
    name?: string;
    // Add other collection center properties as needed
}

interface ProductStockItem {
    product_id: number;
    imei: string;
    color: string;
    product_name: string;
    category_id: number;
    category_name: string;
    buying_price: number;
    selling_price: number;
    quantity: number;
}

interface WarehouseStock {
    warehouse: Warehouse;
    total_units: number;
    total_value: number;
    products: ProductStockItem[];
}

interface CollectionCenterStock {
    collection_center: CollectionCenter;
    total_units: number;
    total_value: number;
    products: ProductStockItem[];
}

interface StockReportSummary {
    total_warehouse_units: number;
    total_warehouse_value: number;
    total_cc_units: number;
    total_cc_value: number;
    total_units: number;
    total_value: number;
}

interface StockReportData {
    warehouse_stock: WarehouseStock;
    collection_center_stock: CollectionCenterStock[];
    summary: StockReportSummary;
}

// ==================== Purchases Report Types ====================

interface Supplier {
    supplier_id: number;
    supplier_name: string;
    // Add other supplier properties
}

interface PurchaseCategory {
    category_id: number;
    category_name: string;
}

interface Purchase {
    created_at: string;
    subtotal: number;
    quantity_ordered: number;
    status: string;
    supplier_id: number;
    category_id: number;
    supplier?: Supplier;
    category?: PurchaseCategory;
    // Add other purchase properties
}

interface BySupplierItem {
    supplier_id: number | null;
    supplier_name: string;
    purchase_count: number;
    quantity: number;
    amount: number;
    percentage: number;
}

interface ByCategoryItem {
    category_id: number | null;
    category_name: string;
    purchase_count: number;
    quantity: number;
    amount: number;
}

interface ByStatusItem {
    status: string;
    count: number;
    amount: number;
}

interface PurchasesReportSummary {
    total_purchases: number;
    total_quantity: number;
    total_amount: number;
    average_order_value: number;
    average_unit_price: number;
    by_supplier: BySupplierItem[];
    by_category: ByCategoryItem[];
    by_status: ByStatusItem[];
}

interface PurchaseTrendItem {
    period: string;
    start_date: string;
    end_date: string;
    purchases: number;
    quantity: number;
    amount: number;
    month_name?: string; // For monthly grouping
}

interface PurchasesReportFilter {
    period: string;
    from_date: string;
    to_date: string;
    status: string;
    supplier_id: number | null;
    category_id: number | null;
}

interface PurchasesReportData {
    filter: PurchasesReportFilter;
    summary: PurchasesReportSummary;
    trends: PurchaseTrendItem[];
    purchases: Purchase[];
}

// ==================== Sales Report Types ====================

interface Agent {
    agent_id?: number;
    name?: string;
    email?: string;
}

interface Customer {
    customer_id?: number;
    customer_name?: string;
    msisdn?: string;
}

interface Product {
    product_id: number;
    product_name: string;
    category_name: string;
    category_id?: number;
    category?: Category;
}

interface Category {
    category_id: number;
    category_name: string;
}

interface Sale {
    created_at: string;
    total_amount: number;
    payment_method: string;
    status: string;
    agent_id: number;
    customer_id: number;
    product_id: number;
    agent?: Agent;
    customer?: Customer;
    product?: Product;
}

// Sales Grouped Data Types
interface AgentGroupItem {
    agent_id: number;
    agent_name: string;
    agent_email: string | null;
    sales_count: number;
    revenue: number;
    avg_ticket: number;
}

interface CustomerGroupItem {
    customer_id: number;
    customer_name: string;
    customer_phone: string | null;
    orders_count: number;
    total_spent: number;
    avg_ticket: number;
}

interface ProductGroupItem {
    product_id: number;
    product_name: string;
    category_name: string;
    quantity_sold: number;
    revenue: number;
}

interface CategoryGroupItem {
    category_id: number | null;
    category_name: string;
    quantity_sold: number;
    revenue: number;
}

interface DailyGroupItem {
    date: string;
    day_name: string;
    sales_count: number;
    revenue: number;
}

type GroupedData = AgentGroupItem[] | CustomerGroupItem[] | ProductGroupItem[] | CategoryGroupItem[] | DailyGroupItem[];

interface PaymentMethodBreakdown {
    method: string;
    count: number;
    amount: number;
    percentage: number;
}

interface TopProductItem {
    product_id: number;
    product_name: string;
    category_name: string;
    quantity_sold: number;
    revenue: number;
}

interface AgentPerformanceItem {
    agent_id: number;
    agent_name: string;
    sales_count: number;
    revenue: number;
    avg_ticket: number;
}

interface SalesReportSummary {
    total_transactions: number;
    total_revenue: number;
    average_transaction_value: number;
    group_by: string;
    groups: GroupedData;
    payment_methods: PaymentMethodBreakdown[];
    top_products: TopProductItem[];
    top_agents: AgentPerformanceItem[];
}

interface SalesTrendItem {
    period: string;
    start_date: string;
    end_date: string;
    transactions: number;
    revenue: number;
    growth: number;
    month_name?: string; // For monthly grouping
}

interface SalesReportFilter {
    period: string;
    from_date: string;
    to_date: string;
    group_by: string;
}

interface SalesReportData {
    filter: SalesReportFilter;
    summary: SalesReportSummary;
    trends: SalesTrendItem[];
    sales: Sale[];
}

// ==================== API Request Parameters ====================

interface StockReportParams {
    warehouse_id?: number;
    cc_id?: number;
    category_id?: number;
}

interface PurchasesReportParams {
    period?: 'weekly' | 'monthly' | 'yearly' | 'custom';
    year?: number;
    month?: number;
    week?: number;
    from_date?: string;
    to_date?: string;
    supplier_id?: number;
    category_id?: number;
    status?: 'pending' | 'completed' | 'cancelled' | 'all';
}

interface SalesReportParams {
    period?: 'weekly' | 'monthly' | 'yearly' | 'custom';
    year?: number;
    month?: number;
    week?: number;
    from_date?: string;
    to_date?: string;
    group_by?: 'agent' | 'customer' | 'product' | 'category' | 'daily';
    agent_id?: number;
    customer_id?: number;
    product_id?: number;
    category_id?: number;
}

interface WeeklySalesParams {
    year?: number;
    week?: number;
}

interface MonthlySalesParams {
    year?: number;
    month?: number;
}

interface YearlySalesParams {
    year?: number;
}

interface CustomSalesParams {
    from_date: string;
    to_date: string;
}

// ==================== API Response Types ====================

type StockReportResponse = BaseResponse<StockReportData>;
type PurchasesReportResponse = BaseResponse<PurchasesReportData>;
type SalesReportResponse = BaseResponse<SalesReportData>;