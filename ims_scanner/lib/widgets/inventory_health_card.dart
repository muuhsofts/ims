import 'package:flutter/material.dart';
import '../../config/app_theme.dart';

class InventoryHealthCard extends StatelessWidget {
  final int inventoryLevel;
  final int totalProducts;
  final double inventoryPercent;

  const InventoryHealthCard({
    super.key,
    required this.inventoryLevel,
    required this.totalProducts,
    required this.inventoryPercent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: AppTheme.cardDecoration(),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Inventory Health', style: AppTheme.headline2),
                const SizedBox(height: 4),
                Text('$inventoryLevel of $totalProducts products in stock', style: AppTheme.bodyText),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: inventoryPercent / 100,
                  backgroundColor: Colors.grey[300],
                  color: inventoryPercent > 70 ? AppTheme.successColor : inventoryPercent > 30 ? AppTheme.warningColor : AppTheme.errorColor,
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          SizedBox(
            width: 90,
            height: 90,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: inventoryPercent / 100,
                  strokeWidth: 8,
                  backgroundColor: Colors.grey[300],
                  color: inventoryPercent > 70 ? AppTheme.successColor : inventoryPercent > 30 ? AppTheme.warningColor : AppTheme.errorColor,
                ),
                Text('${inventoryPercent.toStringAsFixed(0)}%', style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}