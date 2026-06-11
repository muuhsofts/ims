import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/product_category_model.dart';
import '../../providers/product_category_provider.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductCategoryProvider>().loadCategories();
    });
  }

  void _showAddDialog() {
    final nameController = TextEditingController();
    final modelController = TextEditingController();
    final skuController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Add Category', style: AppTheme.headline2),
              const SizedBox(height: 16),
              TextField(
                controller: nameController,
                decoration: AppTheme.inputDecoration(label: 'Category Name *', prefixIcon: Icons.category),
                autofocus: true,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: modelController,
                decoration: AppTheme.inputDecoration(label: 'Model (optional)', prefixIcon: Icons.device_hub),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: skuController,
                decoration: AppTheme.inputDecoration(label: 'SKU (optional)', prefixIcon: Icons.qr_code), // fixed
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(side: BorderSide(color: AppTheme.borderLight), padding: const EdgeInsets.symmetric(vertical: 14)),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        if (nameController.text.trim().isEmpty) return;
                        final formData = ProductCategoryFormData(
                          categoryName: nameController.text.trim(),
                          model: modelController.text.trim(),
                          sku: skuController.text.trim(),
                        );
                        final success = await context.read<ProductCategoryProvider>().createCategory(formData);
                        if (success && mounted) Navigator.pop(ctx);
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor, padding: const EdgeInsets.symmetric(vertical: 14)),
                      child: const Text('Create'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showEditDialog(ProductCategory category) {
    final nameController = TextEditingController(text: category.categoryName);
    final modelController = TextEditingController(text: category.model);
    final skuController = TextEditingController(text: category.sku);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Edit Category', style: AppTheme.headline2),
              const SizedBox(height: 16),
              TextField(
                controller: nameController,
                decoration: AppTheme.inputDecoration(label: 'Category Name *', prefixIcon: Icons.category),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: modelController,
                decoration: AppTheme.inputDecoration(label: 'Model', prefixIcon: Icons.device_hub),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: skuController,
                decoration: AppTheme.inputDecoration(label: 'SKU', prefixIcon: Icons.qr_code), // fixed
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(side: BorderSide(color: AppTheme.borderLight), padding: const EdgeInsets.symmetric(vertical: 14)),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        if (nameController.text.trim().isEmpty) return;
                        final formData = ProductCategoryFormData(
                          categoryName: nameController.text.trim(),
                          model: modelController.text.trim(),
                          sku: skuController.text.trim(),
                        );
                        final success = await context.read<ProductCategoryProvider>().updateCategory(category.categoryId, formData);
                        if (success && mounted) Navigator.pop(ctx);
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor, padding: const EdgeInsets.symmetric(vertical: 14)),
                      child: const Text('Update'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDelete(String id, String name) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Category'),
        content: Text('Delete "$name"?'),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      final success = await context.read<ProductCategoryProvider>().deleteCategory(id);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Category deleted'), backgroundColor: AppTheme.successColor));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ProductCategoryProvider>();
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: const Text('Categories'),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: _showAddDialog),
        ],
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: AppTheme.darkText,
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : provider.categories.isEmpty
          ? Center(child: Text('No categories', style: AppTheme.bodyText))
          : GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.1,
        ),
        itemCount: provider.categories.length,
        itemBuilder: (ctx, i) {
          final c = provider.categories[i];
          return Container(
            decoration: AppTheme.cardDecoration(),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onLongPress: () => _showEditDialog(c),
                borderRadius: BorderRadius.circular(16),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.category, size: 48, color: AppTheme.primaryColor),
                      const SizedBox(height: 12),
                      Text(c.categoryName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text('${c.model ?? ''} ${c.sku ?? ''}'.trim(), style: AppTheme.bodyText, maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 8),
                      PopupMenuButton(
                        icon: const Icon(Icons.more_vert, size: 20),
                        onSelected: (value) {
                          if (value == 'edit') _showEditDialog(c);
                          if (value == 'delete') _confirmDelete(c.categoryId, c.categoryName);
                        },
                        itemBuilder: (_) => [
                          const PopupMenuItem(value: 'edit', child: Row(children: [Icon(Icons.edit), SizedBox(width: 8), Text('Edit')])),
                          const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete, color: Colors.red), SizedBox(width: 8), Text('Delete')])),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}