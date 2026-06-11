class Permissions {
  // Products
  static const String viewProducts = 'products.view';
  static const String createProducts = 'products.create';
  static const String editProducts = 'products.edit';
  static const String deleteProducts = 'products.delete';
  static const String restoreProducts = 'products.restore';
  static const String forceDeleteProducts = 'products.force_delete';
  static const String changeProductStatus = 'products.change_status';
  static const String scanProducts = 'products.scan';

  // Categories
  static const String viewCategories = 'categories.view';
  static const String createCategories = 'categories.create';
  static const String editCategories = 'categories.edit';
  static const String deleteCategories = 'categories.delete';

  // Dashboard
  static const String viewDashboard = 'dashboard.view';

  // Helper to check if a permission exists in the user's list
  static bool hasPermission(List<String>? userPermissions, String permission) {
    if (userPermissions == null) return false;
    return userPermissions.contains(permission);
  }
}