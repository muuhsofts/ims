import 'package:flutter/material.dart';
import '../config/app_theme.dart';

class Product {
  final String productId;
  final String categoryId;
  final String? imei;
  final String? sku;            // ✅ single string SKU (product’s own)
  final String? color;
  final double buyingPrice;
  final double sellingPrice;
  final String? imageFile;
  final String status;
  final String stockStatus;
  final DateTime? deletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Map<String, dynamic>? category;

  final String productName;
  final String categoryName;
  final String? categoryModel;
  // categorySku is kept for backward compatibility but NOT used in UI
  final String? categorySku;

  Product({
    required this.productId,
    required this.categoryId,
    this.imei,
    this.sku,
    this.color,
    required this.buyingPrice,
    required this.sellingPrice,
    this.imageFile,
    required this.status,
    required this.stockStatus,
    this.deletedAt,
    required this.createdAt,
    required this.updatedAt,
    this.category,
    required this.productName,
    required this.categoryName,
    this.categoryModel,
    this.categorySku,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    double parsePrice(dynamic value) {
      if (value == null) return 0.0;
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0.0;
      return 0.0;
    }

    // ✅ Parse SKU safely: if it’s a list, take the first element
    String? parseSku(dynamic skuRaw) {
      if (skuRaw == null) return null;
      if (skuRaw is String) return skuRaw;
      if (skuRaw is List && skuRaw.isNotEmpty) return skuRaw.first.toString();
      return skuRaw.toString();
    }

    final categoryMap = json['category'] as Map<String, dynamic>?;
    final apiProductName = json['product_name']?.toString() ?? '';
    final apiCategoryName = json['category_name']?.toString() ?? '';

    final computedName = apiProductName.isNotEmpty
        ? apiProductName
        : '${apiCategoryName.isNotEmpty ? apiCategoryName : 'Unknown'} - ${json['color'] ?? json['imei'] ?? 'No ID'}';

    return Product(
      productId: json['product_id']?.toString() ?? '',
      categoryId: json['category_id']?.toString() ?? '',
      imei: json['imei']?.toString(),
      sku: parseSku(json['sku']),                     // ✅ product’s own SKU
      color: json['color']?.toString(),
      buyingPrice: parsePrice(json['buying_price']),
      sellingPrice: parsePrice(json['selling_price']),
      imageFile: json['image_file']?.toString(),
      status: json['status']?.toString() ?? 'active',
      stockStatus: json['stock_status']?.toString() ?? 'in_stock',
      deletedAt: json['deleted_at'] != null ? DateTime.tryParse(json['deleted_at']) : null,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : DateTime.now(),
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at']) : DateTime.now(),
      category: categoryMap,
      productName: computedName,
      categoryName: apiCategoryName,
      categoryModel: categoryMap?['model']?.toString(),
      categorySku: parseSku(categoryMap?['sku']),    // category SKU (not used in UI)
    );
  }

  bool get isDeleted => deletedAt != null;

  String get statusDisplay {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'sold': return 'Sold';
      case 'damaged': return 'Damaged';
      default: return status;
    }
  }

  Color get statusColor {
    switch (status) {
      case 'active': return AppTheme.successColor;
      case 'inactive': return Colors.grey;
      case 'sold': return Colors.red;
      case 'damaged': return Colors.orange;
      default: return Colors.grey;
    }
  }

  String get detailedSubtitle {
    final parts = <String>[];
    if (categoryModel != null && categoryModel!.isNotEmpty) parts.add('Model: $categoryModel');
    if (sku != null && sku!.isNotEmpty) parts.add('SKU: $sku');          // ✅ product SKU
    if (color != null && color!.isNotEmpty) parts.add('Color: $color');
    if (imei != null && imei!.isNotEmpty) parts.add('IMEI: $imei');
    return parts.isEmpty ? 'No details' : parts.join(' • ');
  }
}

/// Form data used when editing a single product
class ProductFormData {
  String categoryId;
  String? imei;
  String? sku;          // ✅ single string
  String? color;
  double buyingPrice;
  double sellingPrice;
  String status;
  String stockStatus;
  String? imageFilePath;

  ProductFormData({
    required this.categoryId,
    this.imei,
    this.sku,
    this.color,
    required this.buyingPrice,
    required this.sellingPrice,
    this.status = 'active',
    this.stockStatus = 'in_stock',
    this.imageFilePath,
  });

  Map<String, dynamic> toMap() {
    return {
      'category_id': categoryId,
      'imei': imei,
      'sku': sku,
      'color': color,
      'buying_price': buyingPrice.toString(),
      'selling_price': sellingPrice.toString(),
      'status': status,
      'stock_status': stockStatus,
    };
  }
}