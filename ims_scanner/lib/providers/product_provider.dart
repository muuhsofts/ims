import 'dart:io';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/product_model.dart';

class ProductProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Product> _products = [];
  bool _isLoading = false;
  String? _errorMessage;
  int _currentPage = 1;
  int _lastPage = 1;
  int _total = 0;
  String? _selectedStatus;
  String? _currentSearch;
  bool _showDeleted = false;

  List<Product> get products => _products;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int get currentPage => _currentPage;
  int get lastPage => _lastPage;
  int get total => _total;
  String? get selectedStatus => _selectedStatus;
  bool get showDeleted => _showDeleted;

  void setStatusFilter(String? status) {
    _selectedStatus = status;
    loadProducts(refresh: true);
  }

  void toggleShowDeleted(bool value) {
    _showDeleted = value;
    loadProducts(refresh: true);
  }

  Future<void> loadProducts({
    String? search,
    bool refresh = false,
    int perPage = 20,
  }) async {
    if (refresh) {
      _currentPage = 1;
      _products.clear();
      _currentSearch = search;
    }
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final params = <String, dynamic>{
        'page': _currentPage,
        'per_page': perPage,
        if (_currentSearch != null && _currentSearch!.isNotEmpty) 'search': _currentSearch,
        if (_selectedStatus != null) 'status': _selectedStatus,
        if (_showDeleted) 'trashed': true,
      };
      final response = await _apiService.getProducts(params: params);
      if (response['success'] == true) {
        final data = response['data'];
        final List<dynamic> items = data['data'] ?? [];
        _products = items.map((item) => Product.fromJson(item)).toList();
        _currentPage = data['current_page'] ?? 1;
        _lastPage = data['last_page'] ?? 1;
        _total = data['total'] ?? 0;
      } else {
        _errorMessage = response['message'] ?? 'Failed to load products';
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createBulkProduct({
    required String categoryId,
    required String sku,
    required List<String> imeis,
    required double buyingPrice,
    required double sellingPrice,
    String status = 'active',
    File? imageFile,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = {
        'category_id': categoryId,
        'sku': sku,
        'imeis': imeis.join('\n'),
        'buying_price': buyingPrice.toString(),
        'selling_price': sellingPrice.toString(),
        'status': status,
      };
      final response = await _apiService.createProduct(data, imageFile: imageFile);
      if (response['success'] == true) {
        await loadProducts(refresh: true);
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Failed to create products';
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

  Future<bool> updateProduct(String productId, ProductFormData formData, {File? imageFile}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.updateProduct(productId, formData.toMap(), imageFile: imageFile);
      if (response['success'] == true) {
        await loadProducts(refresh: true);
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Failed to update product';
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

  Future<bool> deleteProduct(String productId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.deleteProduct(productId);
      if (response['success'] == true) {
        await loadProducts(refresh: true);
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

  Future<bool> restoreProduct(String productId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.restoreProduct(productId);
      if (response['success'] == true) {
        await loadProducts(refresh: true);
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Restore failed';
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

  Future<bool> forceDeleteProduct(String productId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.forceDeleteProduct(productId);
      if (response['success'] == true) {
        await loadProducts(refresh: true);
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Permanent delete failed';
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

  Future<bool> changeStatus(String productId, String status) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.changeProductStatus(productId, status);
      if (response['success'] == true) {
        await loadProducts(refresh: true);
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Status change failed';
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

  Future<Product?> scanImei(String imei) async {
    try {
      final response = await _apiService.scanByImei(imei);
      if (response['success'] == true) {
        return Product.fromJson(response['data']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}