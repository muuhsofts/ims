class DashboardAnalytics {
  final CardData cards;
  final ExtendedAnalytics extendedAnalytics;
  final List<PieChartItem> pieChart;
  final List<TopPurchase> topPurchases;
  final List<TopSale> topSales;
  final List<ProductsByCategory> productsByCategory;
  final List<WeeklySale> weeklySales;

  DashboardAnalytics({
    required this.cards,
    required this.extendedAnalytics,
    required this.pieChart,
    required this.topPurchases,
    required this.topSales,
    required this.productsByCategory,
    required this.weeklySales,
  });

  factory DashboardAnalytics.fromJson(Map<String, dynamic> json) {
    final cardsJson = json['cards'] as Map<String, dynamic>;
    final extendedJson = json['extended_analytics'] as Map<String, dynamic>? ?? {};
    final pieJson = json['pie_chart'] as List<dynamic>? ?? [];
    final purchasesJson = json['top_5_purchases'] as List<dynamic>? ?? [];
    final salesJson = json['top_5_sales_with_customers'] as List<dynamic>? ?? [];
    final productsJson = json['products_by_category'] as List<dynamic>? ?? [];
    final weeklyJson = json['weekly_sales'] as List<dynamic>? ?? [];

    return DashboardAnalytics(
      cards: CardData.fromJson(cardsJson),
      extendedAnalytics: ExtendedAnalytics.fromJson(extendedJson),
      pieChart: pieJson.map((e) => PieChartItem.fromJson(e as Map<String, dynamic>)).toList(),
      topPurchases: purchasesJson.map((e) => TopPurchase.fromJson(e as Map<String, dynamic>)).toList(),
      topSales: salesJson.map((e) => TopSale.fromJson(e as Map<String, dynamic>)).toList(),
      productsByCategory: productsJson.map((e) => ProductsByCategory.fromJson(e as Map<String, dynamic>)).toList(),
      weeklySales: weeklyJson.map((e) => WeeklySale.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class CardData {
  final int totalUsers;
  final int totalCustomers;
  final int totalSuppliers;
  final int totalPurchases;
  final int totalProducts;
  final int totalCategories;
  final String inventoryLevel; // Keep as string, parse when needed

  CardData({
    required this.totalUsers,
    required this.totalCustomers,
    required this.totalSuppliers,
    required this.totalPurchases,
    required this.totalProducts,
    required this.totalCategories,
    required this.inventoryLevel,
  });

  factory CardData.fromJson(Map<String, dynamic> json) {
    return CardData(
      totalUsers: _toInt(json['total_users']),
      totalCustomers: _toInt(json['total_customers']),
      totalSuppliers: _toInt(json['total_suppliers']),
      totalPurchases: _toInt(json['total_purchases']),
      totalProducts: _toInt(json['total_products']),
      totalCategories: _toInt(json['total_categories']),
      inventoryLevel: (json['inventory_level'] ?? 0).toString(),
    );
  }
}

class ExtendedAnalytics {
  final AgentInventoryData agentInventory;
  final CCInventoryData collectionCenterInventory;
  final StockDistributionData stockDistributions;
  final StockMovementsData stockMovements;
  final TransferRequestsData transferRequests;

  ExtendedAnalytics({
    required this.agentInventory,
    required this.collectionCenterInventory,
    required this.stockDistributions,
    required this.stockMovements,
    required this.transferRequests,
  });

  factory ExtendedAnalytics.fromJson(Map<String, dynamic> json) {
    return ExtendedAnalytics(
      agentInventory: AgentInventoryData.fromJson(json['agent_inventory'] ?? {}),
      collectionCenterInventory: CCInventoryData.fromJson(json['collection_center_inventory'] ?? {}),
      stockDistributions: StockDistributionData.fromJson(json['stock_distributions'] ?? {}),
      stockMovements: StockMovementsData.fromJson(json['stock_movements'] ?? {}),
      transferRequests: TransferRequestsData.fromJson(json['transfer_requests'] ?? {}),
    );
  }
}

class AgentInventoryData {
  final int totalQuantity;
  final int recordsCount;
  AgentInventoryData({required this.totalQuantity, required this.recordsCount});
  factory AgentInventoryData.fromJson(Map<String, dynamic> json) => AgentInventoryData(
    totalQuantity: _toInt(json['total_quantity']),
    recordsCount: _toInt(json['records_count']),
  );
}

class CCInventoryData {
  final int totalQuantity;
  final int recordsCount;
  CCInventoryData({required this.totalQuantity, required this.recordsCount});
  factory CCInventoryData.fromJson(Map<String, dynamic> json) => CCInventoryData(
    totalQuantity: _toInt(json['total_quantity']),
    recordsCount: _toInt(json['records_count']),
  );
}

class StockDistributionData {
  final int totalQuantity;
  final int pendingCount;
  final int completedCount;
  StockDistributionData({required this.totalQuantity, required this.pendingCount, required this.completedCount});
  factory StockDistributionData.fromJson(Map<String, dynamic> json) => StockDistributionData(
    totalQuantity: _toInt(json['total_quantity']),
    pendingCount: _toInt(json['pending_count']),
    completedCount: _toInt(json['completed_count']),
  );
}

class StockMovementsData {
  final int totalMovements;
  StockMovementsData({required this.totalMovements});
  factory StockMovementsData.fromJson(Map<String, dynamic> json) => StockMovementsData(
    totalMovements: _toInt(json['total_movements']),
  );
}

class TransferRequestsData {
  final int totalRequests;
  final int pendingRequests;
  final int completedRequests;
  TransferRequestsData({required this.totalRequests, required this.pendingRequests, required this.completedRequests});
  factory TransferRequestsData.fromJson(Map<String, dynamic> json) => TransferRequestsData(
    totalRequests: _toInt(json['total_requests']),
    pendingRequests: _toInt(json['pending_requests']),
    completedRequests: _toInt(json['completed_requests']),
  );
}

class PieChartItem {
  final String category;
  final int productCount;
  PieChartItem({required this.category, required this.productCount});
  factory PieChartItem.fromJson(Map<String, dynamic> json) => PieChartItem(
    category: json['category'] ?? '',
    productCount: _toInt(json['product_count']),
  );
}

class TopPurchase {
  final String purchaseId;
  final String supplierName;
  final int quantity;
  final double unitPrice;
  final double subtotal;
  final String status;
  final String createdAt;
  TopPurchase({
    required this.purchaseId,
    required this.supplierName,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
    required this.status,
    required this.createdAt,
  });
  factory TopPurchase.fromJson(Map<String, dynamic> json) => TopPurchase(
    purchaseId: json['purchase_id'] ?? '',
    supplierName: json['supplier_name'] ?? 'N/A',
    quantity: _toInt(json['quantity']),
    unitPrice: _toDouble(json['unit_price']),
    subtotal: _toDouble(json['subtotal']),
    status: json['status'] ?? '',
    createdAt: json['created_at'] ?? '',
  );
}

class TopSale {
  final String saleId;
  final String customerName;
  final String customerPhone;
  final double totalAmount;
  final String paymentMethod;
  final String status;
  final String createdAt;
  TopSale({
    required this.saleId,
    required this.customerName,
    required this.customerPhone,
    required this.totalAmount,
    required this.paymentMethod,
    required this.status,
    required this.createdAt,
  });
  factory TopSale.fromJson(Map<String, dynamic> json) => TopSale(
    saleId: json['sale_id'] ?? '',
    customerName: json['customer_name'] ?? 'N/A',
    customerPhone: json['customer_phone'] ?? '',
    totalAmount: _toDouble(json['total_amount']),
    paymentMethod: json['payment_method'] ?? '',
    status: json['status'] ?? '',
    createdAt: json['created_at'] ?? '',
  );
}

class ProductsByCategory {
  final String category;
  final int count;
  final List<ProductItem> products;
  ProductsByCategory({required this.category, required this.count, required this.products});
  factory ProductsByCategory.fromJson(Map<String, dynamic> json) => ProductsByCategory(
    category: json['category'] ?? 'Uncategorized',
    count: _toInt(json['count']),
    products: (json['products'] as List<dynamic>?)
        ?.map((e) => ProductItem.fromJson(e as Map<String, dynamic>))
        .toList() ?? [],
  );
}

class ProductItem {
  final String productId;
  final String imei;
  final String color;
  final double buyingPrice;
  final double sellingPrice;
  final String stockStatus;
  ProductItem({
    required this.productId,
    required this.imei,
    required this.color,
    required this.buyingPrice,
    required this.sellingPrice,
    required this.stockStatus,
  });
  factory ProductItem.fromJson(Map<String, dynamic> json) => ProductItem(
    productId: json['product_id'] ?? '',
    imei: json['imei'] ?? '',
    color: json['color'] ?? '',
    buyingPrice: _toDouble(json['buying_price']),
    sellingPrice: _toDouble(json['selling_price']),
    stockStatus: json['stock_status'] ?? 'unknown',
  );
}

class WeeklySale {
  final String day;
  final int salesCount;
  WeeklySale({required this.day, required this.salesCount});
  factory WeeklySale.fromJson(Map<String, dynamic> json) => WeeklySale(
    day: json['day'] ?? '',
    salesCount: _toInt(json['sales_count']),
  );
}

// Helper functions to safely convert dynamic to int/double
int _toInt(dynamic value) {
  if (value == null) return 0;
  if (value is int) return value;
  if (value is String) return int.tryParse(value) ?? 0;
  if (value is double) return value.toInt();
  return 0;
}

double _toDouble(dynamic value) {
  if (value == null) return 0.0;
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0.0;
  return 0.0;
}