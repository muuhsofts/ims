import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/product_model.dart';

class ProductDetailScreen extends StatelessWidget {
  final Product product;
  const ProductDetailScreen({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: const Text('Product Details'),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.darkText,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Product image
            Container(
              decoration: AppTheme.cardDecoration(),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: product.imageFile != null
                    ? Image.network(product.imageFile!, height: 220, width: double.infinity, fit: BoxFit.cover)
                    : Container(
                  height: 220,
                  color: AppTheme.borderLight,
                  child: Icon(Icons.phone_android, size: 80, color: AppTheme.greyText),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Main info card
            Container(
              decoration: AppTheme.cardDecoration(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Product Information', style: AppTheme.headline2),
                  const SizedBox(height: 16),

                  _infoRow(Icons.label, 'Product Name', product.productName),
                  _divider(),
                  _infoRow(Icons.category, 'Category', product.categoryName),
                  _divider(),
                  if (product.categoryModel != null && product.categoryModel!.isNotEmpty)
                    _infoRow(Icons.model_training, 'Model', product.categoryModel!),
                  if (product.categoryModel != null && product.categoryModel!.isNotEmpty) _divider(),

                  // ✅ SKU from the product’s own field (string)
                  if (product.sku != null && product.sku!.isNotEmpty)
                    _infoRow(Icons.sd, 'SKU', product.sku!),
                  if (product.sku != null && product.sku!.isNotEmpty) _divider(),

                  _infoRow(Icons.qr_code, 'IMEI', product.imei ?? '—'),
                  _divider(),
                  _infoRow(Icons.attach_money, 'Buying Price', 'TSh ${product.buyingPrice.toStringAsFixed(0)}'),
                  _divider(),
                  _infoRow(Icons.price_change, 'Selling Price', 'TSh ${product.sellingPrice.toStringAsFixed(0)}'),
                  _divider(),
                  _infoRow(Icons.trending_up, 'Status', product.statusDisplay, color: product.statusColor),
                  _divider(),
                  _infoRow(Icons.inventory, 'Stock Status', product.stockStatus.replaceAll('_', ' ').toUpperCase()),
                  _divider(),
                  _infoRow(Icons.calendar_today, 'Created At', '${product.createdAt.toLocal()}'),

                  if (product.deletedAt != null) ...[
                    _divider(),
                    _infoRow(Icons.delete, 'Deleted At', '${product.deletedAt!.toLocal()}', color: AppTheme.errorColor),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value, {Color color = AppTheme.black}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppTheme.primaryColor),
          const SizedBox(width: 12),
          SizedBox(width: 100, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
          Expanded(child: Text(value, style: TextStyle(color: color))),
        ],
      ),
    );
  }

  Widget _divider() => Divider(height: 1, color: AppTheme.borderLight);
}