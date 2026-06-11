class ProductCategory {
  final String categoryId;
  final String categoryName;
  final String? model;
  final String? sku;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;

  ProductCategory({
    required this.categoryId,
    required this.categoryName,
    this.model,
    this.sku,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ProductCategory.fromJson(Map<String, dynamic> json) {
    return ProductCategory(
      categoryId: json['category_id'] ?? '',
      categoryName: json['category_name'] ?? '',
      model: json['model'],
      sku: json['sku'],
      status: json['status'] ?? 'active',
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'category_id': categoryId,
      'category_name': categoryName,
      'model': model,
      'sku': sku,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

class ProductCategoryFormData {
  String categoryName;
  String? model;
  String? sku;
  String status;

  ProductCategoryFormData({
    required this.categoryName,
    this.model,
    this.sku,
    this.status = 'active',
  });

  Map<String, dynamic> toMap() {
    return {
      'category_name': categoryName,
      'model': model,
      'sku': sku,
      'status': status,
    };
  }
}