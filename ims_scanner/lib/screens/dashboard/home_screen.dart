import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/dashboard_models.dart';
import '../../widgets/inventory_health_card.dart';
import '../../widgets/metric_card.dart';
import '../../widgets/extended_metrics_histogram.dart';
import '../../widgets/weekly_sales_chart.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _selectedPeriod = '';
  DateTime? _selectedDate;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    final provider = context.read<DashboardProvider>();
    if (_selectedPeriod.isNotEmpty) {
      provider.setPeriod(_selectedPeriod, date: _selectedDate);
    } else {
      provider.fetchAnalytics();
    }
  }

  // Helper to get responsive grid crossAxisCount
  int _getCrossAxisCount(BoxConstraints constraints) {
    if (constraints.maxWidth >= 1200) return 4;
    if (constraints.maxWidth >= 800) return 3;
    return 2;
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final dashboardProvider = context.watch<DashboardProvider>();
    final screenWidth = MediaQuery.of(context).size.width;

    // Permission check temporarily removed – uncomment when backend provides 'dashboard.view'
    /*
    if (!authProvider.hasPermission(Permissions.viewDashboard)) {
      return AccessDeniedScreen();
    }
    */

    if (dashboardProvider.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (dashboardProvider.errorMessage != null || dashboardProvider.analytics == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: AppTheme.errorColor),
              const SizedBox(height: 16),
              Text(dashboardProvider.errorMessage ?? 'No data available'),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _loadData, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    final analytics = dashboardProvider.analytics!;
    final cards = analytics.cards;
    final extended = analytics.extendedAnalytics;
    final pieChart = analytics.pieChart;
    final topPurchases = analytics.topPurchases;
    final topSales = analytics.topSales;
    final productsByCategory = analytics.productsByCategory;
    final weeklySales = analytics.weeklySales;

    final totalProducts = cards.totalProducts;
    final inventoryLevel = int.tryParse(cards.inventoryLevel) ?? 0;
    final inventoryPercent = totalProducts > 0 ? (inventoryLevel / totalProducts) * 100 : 0.0;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('IMS Analytics Dashboard'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 2,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_alt),
            onSelected: (value) {
              setState(() {
                if (value.isEmpty) {
                  _selectedPeriod = '';
                  _selectedDate = null;
                } else {
                  _selectedPeriod = value;
                  _selectedDate = DateTime.now();
                }
              });
              _loadData();
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: '', child: Text('All time')),
              const PopupMenuItem(value: 'daily', child: Text('Daily')),
              const PopupMenuItem(value: 'monthly', child: Text('Monthly')),
              const PopupMenuItem(value: 'yearly', child: Text('Yearly')),
            ],
          ),
          if (_selectedPeriod.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.calendar_today),
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate ?? DateTime.now(),
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                );
                if (picked != null) {
                  setState(() => _selectedDate = picked);
                  _loadData();
                }
              },
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final crossAxisCount = _getCrossAxisCount(constraints);
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ---------- Primary Metrics ----------
                Text('Key Metrics', style: AppTheme.headline2),
                const SizedBox(height: 12),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: crossAxisCount,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: screenWidth < 600 ? 1.2 : 1.4,
                  children: [
                    MetricCard(title: 'Total Users', value: cards.totalUsers.toString(), icon: Icons.people, color: AppTheme.primaryColor),
                    MetricCard(title: 'Customers', value: cards.totalCustomers.toString(), icon: Icons.person, color: AppTheme.secondaryColor),
                    MetricCard(title: 'Suppliers', value: cards.totalSuppliers.toString(), icon: Icons.business, color: AppTheme.accentColor),
                    MetricCard(title: 'Purchases', value: cards.totalPurchases.toString(), icon: Icons.shopping_cart, color: AppTheme.salat),
                    MetricCard(title: 'Products', value: cards.totalProducts.toString(), icon: Icons.inventory, color: AppTheme.primaryColor),
                    MetricCard(title: 'Categories', value: cards.totalCategories.toString(), icon: Icons.category, color: AppTheme.warningColor),
                    MetricCard(title: 'Inventory Items', value: cards.inventoryLevel, icon: Icons.storage, color: AppTheme.successColor),
                  ],
                ),
                const SizedBox(height: 24),

                // ---------- Operational Insights ----------
                Text('Operational Insights', style: AppTheme.headline2),
                const SizedBox(height: 12),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: crossAxisCount,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: screenWidth < 600 ? 1.2 : 1.4,
                  children: [
                    MetricCard(title: 'Total Agent Stock (Qty)', value: extended.agentInventory.totalQuantity.toString(), icon: Icons.inventory, color: Colors.orange),
                    MetricCard(title: 'Total CC Stock (Qty)', value: extended.collectionCenterInventory.totalQuantity.toString(), icon: Icons.warehouse, color: Colors.cyan),
                    MetricCard(title: 'Total Distributed Qty', value: extended.stockDistributions.totalQuantity.toString(), icon: Icons.local_shipping, color: Colors.lightGreen),
                    MetricCard(title: 'Pending Distributions', value: extended.stockDistributions.pendingCount.toString(), icon: Icons.pending_actions, color: Colors.amber),
                    MetricCard(title: 'Total Stock Movements', value: extended.stockMovements.totalMovements.toString(), icon: Icons.swap_horiz, color: Colors.purple),
                    MetricCard(title: 'Total Transfer Requests', value: extended.transferRequests.totalRequests.toString(), icon: Icons.request_page, color: Colors.pink),
                  ],
                ),
                const SizedBox(height: 16),

                // Histogram – responsive height
                ExtendedMetricsHistogram(extended: extended, screenWidth: screenWidth),
                const SizedBox(height: 24),

                // Inventory Health
                InventoryHealthCard(
                  inventoryLevel: inventoryLevel,
                  totalProducts: totalProducts,
                  inventoryPercent: inventoryPercent,
                ),
                const SizedBox(height: 24),

                // Stock Status Breakdown
                Container(
                  decoration: AppTheme.cardDecoration(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Stock Status Breakdown', style: AppTheme.headline2),
                      const SizedBox(height: 12),
                      ..._buildStockStatusList(productsByCategory, totalProducts),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Pie Chart
                Container(
                  decoration: AppTheme.cardDecoration(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Product Categories', style: AppTheme.headline2),
                      const SizedBox(height: 12),
                      _buildPieChart(pieChart),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Top Purchases List
                Container(
                  decoration: AppTheme.cardDecoration(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Top Purchases by Supplier', style: AppTheme.headline2),
                      const SizedBox(height: 12),
                      _buildTopPurchasesList(topPurchases),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Weekly Sales Trend
                if (weeklySales.isNotEmpty) WeeklySalesChart(weeklySales: weeklySales),
                const SizedBox(height: 24),

                // Top 5 Sales Transactions (scrollable table)
                Container(
                  decoration: AppTheme.cardDecoration(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Top 5 Sales Transactions', style: AppTheme.headline2),
                      const SizedBox(height: 12),
                      _buildTopSalesTable(topSales),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // ---------- Product Catalog (enhanced) ----------
                Text('Product Catalog by Category', style: AppTheme.headline2),
                const SizedBox(height: 12),
                _buildProductsByCategory(productsByCategory),
              ],
            ),
          );
        },
      ),
    );
  }

  // ---------- Helper methods ----------
  List<Widget> _buildStockStatusList(List<ProductsByCategory> categories, int totalProducts) {
    final Map<String, int> statusCount = {};
    for (final cat in categories) {
      for (final prod in cat.products) {
        final status = prod.stockStatus;
        statusCount[status] = (statusCount[status] ?? 0) + 1;
      }
    }
    if (statusCount.isEmpty) return [const Text('No stock data available')];
    return statusCount.entries.map((entry) {
      final percent = (entry.value / totalProducts) * 100;
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(entry.key.replaceAll('_', ' ').toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w600)),
              Text('${entry.value} items (${percent.toStringAsFixed(1)}%)', style: AppTheme.bodyText),
            ]),
            const SizedBox(height: 4),
            LinearProgressIndicator(value: percent / 100, backgroundColor: Colors.grey[300]),
          ],
        ),
      );
    }).toList();
  }

  Widget _buildPieChart(List<PieChartItem> items) {
    final filtered = items.where((e) => e.productCount > 0).toList();
    if (filtered.isEmpty) return const Center(child: Text('No data'));
    return SizedBox(
      height: 250,
      child: PieChart(
        PieChartData(
          sections: filtered.asMap().entries.map((entry) {
            final idx = entry.key;
            final item = entry.value;
            return PieChartSectionData(
              value: item.productCount.toDouble(),
              title: '${item.category}\n${item.productCount}',
              color: _getColorForIndex(idx),
              radius: 100,
              titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
            );
          }).toList(),
          sectionsSpace: 2,
          centerSpaceRadius: 40,
        ),
      ),
    );
  }

  Color _getColorForIndex(int index) {
    final colors = [AppTheme.primaryColor, AppTheme.secondaryColor, AppTheme.accentColor, AppTheme.salat, Colors.orange, Colors.purple, Colors.teal];
    return colors[index % colors.length];
  }

  Widget _buildTopPurchasesList(List<TopPurchase> purchases) {
    if (purchases.isEmpty) return const Center(child: Text('No purchase data'));
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: purchases.length,
      itemBuilder: (ctx, i) {
        final p = purchases[i];
        final maxSubtotal = purchases.map((e) => e.subtotal).reduce((a, b) => a > b ? a : b);
        final percent = (p.subtotal / maxSubtotal) * 100;
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: AppTheme.cardDecoration(),
          child: ListTile(
            leading: CircleAvatar(backgroundColor: i == 0 ? AppTheme.successColor : AppTheme.primaryColor, child: Text('${i + 1}', style: const TextStyle(color: Colors.white))),
            title: Text(p.supplierName, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Qty: ${p.quantity} | Unit: ${p.unitPrice.toStringAsFixed(0)} TSh'),
                const SizedBox(height: 4),
                LinearProgressIndicator(value: percent / 100, backgroundColor: Colors.grey[300], color: i == 0 ? AppTheme.successColor : AppTheme.primaryColor),
              ],
            ),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: p.status == 'completed' ? AppTheme.successColor : AppTheme.warningColor, borderRadius: BorderRadius.circular(12)),
              child: Text(p.status.toUpperCase(), style: const TextStyle(fontSize: 10, color: Colors.white)),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTopSalesTable(List<TopSale> sales) {
    if (sales.isEmpty) return const Center(child: Text('No sales data'));
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columnSpacing: 12,
        columns: const [
          DataColumn(label: Text('Customer')),
          DataColumn(label: Text('Phone')),
          DataColumn(label: Text('Amount (TSh)', textAlign: TextAlign.right)),
          DataColumn(label: Text('Method')),
          DataColumn(label: Text('Status')),
        ],
        rows: sales.map((s) => DataRow(cells: [
          DataCell(Text(s.customerName)),
          DataCell(Text(s.customerPhone)),
          DataCell(Text('${s.totalAmount.toStringAsFixed(0)}', textAlign: TextAlign.right)),
          DataCell(Text(s.paymentMethod)),
          DataCell(Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: s.status == 'completed' ? AppTheme.successColor : AppTheme.warningColor, borderRadius: BorderRadius.circular(12)),
            child: Text(s.status.toUpperCase(), style: const TextStyle(fontSize: 10, color: Colors.white)),
          )),
        ])).toList(),
      ),
    );
  }

  // 🔥 ENHANCED PRODUCT CATALOG – shows product name (Category - Color/IMEI) and IMEI in subtitle
  Widget _buildProductsByCategory(List<ProductsByCategory> categories) {
    if (categories.isEmpty) return const Center(child: Text('No products found'));
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: categories.length,
      itemBuilder: (ctx, i) {
        final cat = categories[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          child: ExpansionTile(
            title: Text('${cat.category} (${cat.count} products)', style: const TextStyle(fontWeight: FontWeight.w600)),
            children: cat.products.map((product) {
              // Create product name: category name + color (or IMEI if color missing)
              final productName = product.color.isNotEmpty
                  ? '${cat.category} - ${product.color}'
                  : '${cat.category} - ${product.imei}';
              return ListTile(
                leading: const Icon(Icons.phone_android),
                title: Text(productName, style: const TextStyle(fontWeight: FontWeight.w500)),
                subtitle: Text('IMEI: ${product.imei} | TSh ${product.sellingPrice.toStringAsFixed(0)}'),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: product.stockStatus == 'in_stock' ? AppTheme.successColor : AppTheme.warningColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    product.stockStatus.replaceAll('_', ' '),
                    style: const TextStyle(fontSize: 10, color: Colors.white),
                  ),
                ),
              );
            }).toList(),
          ),
        );
      },
    );
  }
}