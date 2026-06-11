import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../config/app_routes.dart';
import '../../providers/product_provider.dart';
import '../../models/product_model.dart';
import '../../widgets/confirmation_dialog.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().loadProducts();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _search() {
    context.read<ProductProvider>().loadProducts(
      search: _searchController.text.trim(),
      refresh: true,
    );
  }

  int _getCrossAxisCount(double width) {
    if (width < 600) return 1;
    if (width < 900) return 2;
    return 3;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<ProductProvider>().loadProducts(refresh: true),
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => Navigator.pushNamed(context, AppRoutes.createProduct),
          ),
        ],
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.darkText,
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isSmall = constraints.maxWidth < 600;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: isSmall
                    ? Column(children: [
                  TextField(
                    controller: _searchController,
                    decoration: AppTheme.inputDecoration(
                      hint: 'Search by IMEI or product name...',
                      prefixIcon: Icons.search,
                    ),
                    onSubmitted: (_) => _search(),
                  ),
                ])
                    : Row(children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      decoration: AppTheme.inputDecoration(
                        hint: 'Search by IMEI or product name...',
                        prefixIcon: Icons.search,
                      ),
                      onSubmitted: (_) => _search(),
                    ),
                  ),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.start,
                  children: [
                    _buildStatusChip('All', null, context),
                    _buildStatusChip('Active', 'active', context),
                    _buildStatusChip('Inactive', 'inactive', context),
                    _buildStatusChip('Sold', 'sold', context),
                    _buildStatusChip('Damaged', 'damaged', context),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: _buildResponsiveBody(context, constraints.maxWidth),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildResponsiveBody(BuildContext context, double maxWidth) {
    final provider = context.watch<ProductProvider>();

    if (provider.isLoading) return const Center(child: CircularProgressIndicator());
    if (provider.errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wifi_off, size: 64, color: AppTheme.errorColor),
            const SizedBox(height: 16),
            Text('Cannot connect to server'),
            const SizedBox(height: 8),
            Text(provider.errorMessage!, style: AppTheme.bodyText),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => provider.loadProducts(refresh: true),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }
    if (provider.products.isEmpty) {
      return Center(child: Text('No products found', style: AppTheme.bodyText));
    }

    final crossAxisCount = _getCrossAxisCount(maxWidth);
    final isGrid = crossAxisCount > 1;

    if (isGrid) {
      return RefreshIndicator(
        onRefresh: () => provider.loadProducts(refresh: true),
        child: GridView.builder(
          padding: const EdgeInsets.all(12),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: 0.85,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemCount: provider.products.length,
          itemBuilder: (ctx, i) => _buildProductCardGrid(provider.products[i], maxWidth),
        ),
      );
    } else {
      return RefreshIndicator(
        onRefresh: () => provider.loadProducts(refresh: true),
        child: ListView.builder(
          padding: const EdgeInsets.all(8),
          itemCount: provider.products.length,
          itemBuilder: (ctx, i) => _buildProductCardList(provider.products[i], maxWidth),
        ),
      );
    }
  }

  // ---------- Edit Modal (now uses ProductFormData correctly) ----------
  void _showEditProductModal(Product product) {
    final TextEditingController nameController = TextEditingController(text: product.productName);
    final TextEditingController categoryNameController = TextEditingController(text: product.categoryName);
    final TextEditingController modelController = TextEditingController(text: product.categoryModel ?? '');
    final TextEditingController imeiController = TextEditingController(text: product.imei ?? '');
    final TextEditingController skuController = TextEditingController(text: product.sku ?? ''); // ✅ product.sku

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, scrollController) => Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 16,
            right: 16,
            top: 16,
          ),
          child: SingleChildScrollView(
            controller: scrollController,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Edit Product', style: Theme.of(ctx).textTheme.titleLarge, textAlign: TextAlign.center),
                const SizedBox(height: 20),
                _buildTextField(nameController, 'Product Name', Icons.edit),
                const SizedBox(height: 12),
                _buildTextField(categoryNameController, 'Category', Icons.category),
                const SizedBox(height: 12),
                _buildTextField(modelController, 'Model', Icons.model_training),
                const SizedBox(height: 12),
                _buildTextField(imeiController, 'IMEI', Icons.sim_card),
                const SizedBox(height: 12),
                _buildTextField(skuController, 'SKU', Icons.qr_code),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          // ✅ Build a proper ProductFormData
                          final formData = ProductFormData(
                            categoryId: product.categoryId,
                            imei: imeiController.text.trim().isEmpty ? null : imeiController.text.trim(),
                            sku: skuController.text.trim().isEmpty ? null : skuController.text.trim(),
                            buyingPrice: product.buyingPrice,
                            sellingPrice: product.sellingPrice,
                            status: product.status,
                            stockStatus: product.stockStatus,
                          );
                          final success = await context.read<ProductProvider>().updateProduct(
                            product.productId,
                            formData,
                          );
                          if (success && mounted) {
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Product updated'),
                                backgroundColor: AppTheme.successColor,
                              ),
                            );
                          }
                        },
                        child: const Text('Save'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: AppTheme.primaryColor),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  // ---------- LIST MODE CARD (uses product.sku) ----------
  Widget _buildProductCardList(Product product, double screenWidth) {
    final bool isSmall = screenWidth < 600;
    final double titleFontSize = isSmall ? 14.0 : 16.0;
    final double labelFontSize = isSmall ? 10.0 : 12.0;
    final double statusFontSize = isSmall ? 10.0 : 12.0;
    final double iconSize = isSmall ? 20.0 : 24.0;
    final bool isDeleted = product.deletedAt != null;

    final titleStyle = TextStyle(fontWeight: FontWeight.bold, fontSize: titleFontSize);
    final labelStyle = TextStyle(fontSize: labelFontSize, color: AppTheme.greyText);

    Widget _buildInfoRow(IconData icon, String label, String? value) {
      if (value == null || value.isEmpty) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.only(bottom: 4.0),
        child: Row(
          children: [
            Icon(icon, size: labelFontSize + 2, color: AppTheme.primaryColor),
            const SizedBox(width: 4),
            Expanded(
              child: RichText(
                text: TextSpan(
                  style: labelStyle,
                  children: [
                    TextSpan(text: '$label: ', style: const TextStyle(fontWeight: FontWeight.w500)),
                    TextSpan(text: value),
                  ],
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: EdgeInsets.only(bottom: isSmall ? 10.0 : 12.0),
      decoration: AppTheme.cardDecoration(),
      child: ListTile(
        contentPadding: EdgeInsets.symmetric(horizontal: isSmall ? 12.0 : 16.0, vertical: isSmall ? 6.0 : 8.0),
        leading: Container(
          padding: EdgeInsets.all(isSmall ? 6.0 : 8.0),
          decoration: BoxDecoration(
            color: product.statusColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12.0),
          ),
          child: Icon(Icons.phone_android, color: product.statusColor, size: iconSize),
        ),
        title: Text('Product Name: ${product.productName}', style: titleStyle),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInfoRow(Icons.category, 'Category', product.categoryName),
            _buildInfoRow(Icons.model_training, 'Model', product.categoryModel),
            _buildInfoRow(Icons.sim_card, 'IMEI', product.imei),
            // ✅ SKU from product.sku
            if (product.sku != null && product.sku!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 4.0),
                child: Row(
                  children: [
                    Icon(Icons.qr_code, size: labelFontSize + 2, color: AppTheme.primaryColor),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text('SKU: ${product.sku}', style: labelStyle, overflow: TextOverflow.ellipsis),
                    ),
                  ],
                ),
              ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: EdgeInsets.symmetric(horizontal: isSmall ? 6.0 : 10.0, vertical: isSmall ? 2.0 : 4.0),
              decoration: BoxDecoration(color: product.statusColor, borderRadius: BorderRadius.circular(20.0)),
              child: Text(product.statusDisplay, style: TextStyle(fontSize: statusFontSize, color: Colors.white)),
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: Icon(Icons.edit, size: iconSize, color: AppTheme.primaryColor),
              onPressed: () => _showEditProductModal(product),
              tooltip: 'Edit product',
            ),
          ],
        ),
        onTap: () => Navigator.pushNamed(context, AppRoutes.productDetail, arguments: product),
        onLongPress: () => _showProductMenu(product, isDeleted),
      ),
    );
  }

  // ---------- GRID MODE CARD (uses product.sku) ----------
  Widget _buildProductCardGrid(Product product, double screenWidth) {
    final bool isDeleted = product.deletedAt != null;
    final bool isSmallGrid = screenWidth < 900;
    final double titleFontSize = isSmallGrid ? 14.0 : 16.0;
    final double labelFontSize = isSmallGrid ? 10.0 : 11.0;
    final double statusFontSize = isSmallGrid ? 10.0 : 11.0;
    final double iconSize = isSmallGrid ? 28.0 : 32.0;

    Widget _buildInfoRow(IconData icon, String label, String? value) {
      if (value == null || value.isEmpty) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.only(bottom: 4.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: labelFontSize + 2, color: AppTheme.primaryColor),
            const SizedBox(width: 4),
            Expanded(
              child: RichText(
                text: TextSpan(
                  style: TextStyle(fontSize: labelFontSize, color: AppTheme.greyText),
                  children: [
                    TextSpan(text: '$label: ', style: const TextStyle(fontWeight: FontWeight.w500)),
                    TextSpan(text: value),
                  ],
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      );
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.pushNamed(context, AppRoutes.productDetail, arguments: product),
        onLongPress: () => _showProductMenu(product, isDeleted),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: product.statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.phone_android, color: product.statusColor, size: iconSize),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: product.statusColor, borderRadius: BorderRadius.circular(20)),
                    child: Text(product.statusDisplay, style: TextStyle(fontSize: statusFontSize, color: Colors.white)),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: Icon(Icons.edit, size: 20, color: AppTheme.primaryColor),
                    onPressed: () => _showEditProductModal(product),
                    tooltip: 'Edit product',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Product Name: ${product.productName}',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: titleFontSize),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 6),
              _buildInfoRow(Icons.category, 'Category', product.categoryName),
              _buildInfoRow(Icons.model_training, 'Model', product.categoryModel),
              _buildInfoRow(Icons.sim_card, 'IMEI', product.imei),
              // ✅ SKU from product.sku
              if (product.sku != null && product.sku!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4.0),
                  child: Row(
                    children: [
                      Icon(Icons.qr_code, size: labelFontSize + 2, color: AppTheme.primaryColor),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          'SKU: ${product.sku}',
                          style: TextStyle(fontSize: labelFontSize, color: AppTheme.greyText),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String label, String? value, BuildContext context) {
    final provider = context.watch<ProductProvider>();
    final isSelected = provider.selectedStatus == value;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => provider.setStatusFilter(value),
      backgroundColor: AppTheme.surfaceWhite,
      selectedColor: AppTheme.primaryColor,
      labelStyle: TextStyle(color: isSelected ? Colors.white : AppTheme.darkText),
      side: BorderSide(color: AppTheme.borderLight),
    );
  }

  // ---------- Product menu and actions (unchanged) ----------
  void _showProductMenu(Product product, bool isDeleted) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!isDeleted) ...[
              ListTile(
                leading: const Icon(Icons.edit, color: AppTheme.primaryColor),
                title: const Text('Edit'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showEditProductModal(product);
                },
              ),
              ListTile(
                leading: Icon(
                  product.status == 'active' ? Icons.block : Icons.check_circle,
                  color: product.status == 'active' ? Colors.orange : AppTheme.successColor,
                ),
                title: Text(product.status == 'active' ? 'Deactivate' : 'Activate'),
                onTap: () {
                  Navigator.pop(ctx);
                  _toggleProductStatus(product);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete, color: AppTheme.errorColor),
                title: const Text('Delete'),
                onTap: () {
                  Navigator.pop(ctx);
                  _confirmDelete(product);
                },
              ),
            ] else ...[
              ListTile(
                leading: const Icon(Icons.restore, color: AppTheme.successColor),
                title: const Text('Restore'),
                onTap: () {
                  Navigator.pop(ctx);
                  _restoreProduct(product);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_sweep, color: AppTheme.errorColor),
                title: const Text('Permanently Delete'),
                onTap: () {
                  Navigator.pop(ctx);
                  _forceDeleteProduct(product);
                },
              ),
            ],
            ListTile(
              leading: const Icon(Icons.close),
              title: const Text('Cancel'),
              onTap: () => Navigator.pop(ctx),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _toggleProductStatus(Product product) async {
    final newStatus = product.status == 'active' ? 'inactive' : 'active';
    final confirmed = await showConfirmationDialog(
      context,
      title: newStatus == 'active' ? 'Activate Product' : 'Deactivate Product',
      message: 'Are you sure you want to ${newStatus == 'active' ? 'activate' : 'deactivate'} ${product.productName}?',
    );
    if (confirmed == true) {
      final success = await context.read<ProductProvider>().changeStatus(product.productId, newStatus);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Product ${newStatus}d'), backgroundColor: AppTheme.successColor),
        );
      }
    }
  }

  Future<void> _confirmDelete(Product product) async {
    final confirmed = await showConfirmationDialog(
      context,
      title: 'Delete Product',
      message: 'Are you sure you want to delete ${product.productName}? (Soft delete)',
    );
    if (confirmed == true) {
      final success = await context.read<ProductProvider>().deleteProduct(product.productId);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Product deleted'), backgroundColor: AppTheme.successColor),
        );
      }
    }
  }

  Future<void> _restoreProduct(Product product) async {
    final confirmed = await showConfirmationDialog(
      context,
      title: 'Restore Product',
      message: 'Restore ${product.productName}?',
    );
    if (confirmed == true) {
      final success = await context.read<ProductProvider>().restoreProduct(product.productId);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Product restored'), backgroundColor: AppTheme.successColor),
        );
      }
    }
  }

  Future<void> _forceDeleteProduct(Product product) async {
    final confirmed = await showConfirmationDialog(
      context,
      title: 'Permanently Delete',
      message: 'Are you sure you want to permanently delete ${product.productName}? This cannot be undone.',
    );
    if (confirmed == true) {
      final success = await context.read<ProductProvider>().forceDeleteProduct(product.productId);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Product permanently deleted'), backgroundColor: AppTheme.successColor),
        );
      }
    }
  }
}