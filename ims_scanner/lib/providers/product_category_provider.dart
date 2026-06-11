import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/product_category_model.dart';

class ProductCategoryProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<ProductCategory> _categories = [];
  List<Map<String, dynamic>> _dropdownCategories = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<ProductCategory> get categories => _categories;
  List<Map<String, dynamic>> get dropdownCategories => _dropdownCategories;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> loadCategories({int perPage = 100}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.getCategories(params: {'per_page': perPage});
      if (response['success'] == true) {
        final data = response['data'];
        final List<dynamic> items = data is List ? data : (data['data'] ?? []);
        _categories = items.map((item) => ProductCategory.fromJson(item)).toList();
      } else {
        _errorMessage = response['message'] ?? 'Failed to load categories';
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadDropdownCategories() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.getCategoriesDropdown();
      if (response['success'] == true && response['data'] is List) {
        _dropdownCategories = List<Map<String, dynamic>>.from(response['data']);
      } else {
        _errorMessage = response['message'] ?? 'Failed to load dropdown categories';
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createCategory(ProductCategoryFormData formData) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.createCategory(formData.toMap());
      if (response['success'] == true) {
        await loadCategories();
        await loadDropdownCategories();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Create failed';
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateCategory(String id, ProductCategoryFormData formData) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.updateCategory(id, formData.toMap());
      if (response['success'] == true) {
        await loadCategories();
        await loadDropdownCategories();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Update failed';
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> deleteCategory(String id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.deleteCategory(id);
      if (response['success'] == true) {
        await loadCategories();
        await loadDropdownCategories();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Delete failed';
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> activateCategory(String id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.activateCategory(id);
      if (response['success'] == true) {
        await loadCategories();
        await loadDropdownCategories();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Activation failed';
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> deactivateCategory(String id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.deactivateCategory(id);
      if (response['success'] == true) {
        await loadCategories();
        await loadDropdownCategories();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Deactivation failed';
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> toggleCategoryStatus(String id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.toggleCategoryStatus(id);
      if (response['success'] == true) {
        await loadCategories();
        await loadDropdownCategories();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Toggle failed';
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}