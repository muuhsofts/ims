import 'package:flutter/material.dart';
import '../constants/permissions.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  String? _errorMessage;
  UserModel? _currentUser;
  String? _token;
  List<String>? _permissions;

  AuthProvider() {
    _loadStoredData();
  }

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  UserModel? get currentUser => _currentUser;
  String? get token => _token;
  bool get isLoggedIn => _token != null && _token!.isNotEmpty;
  List<String>? get permissions => _permissions;

  bool hasPermission(String permission) {
    return Permissions.hasPermission(_permissions, permission);
  }

  void setPermissions(List<String> perms) {
    _permissions = perms;
    notifyListeners();
  }

  Future<void> _loadStoredData() async {
    _token = await StorageService.getToken();
    if (_token != null) {
      final user = await StorageService.getUser();
      if (user != null) {
        _currentUser = user;
      }
      await getCurrentUser();  // this will also load permissions
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.login(email, password);
      if (response['success'] == true) {
        _token = response['data']['token'];
        await StorageService.saveToken(_token!);

        final userData = response['data']['user'];
        final roleData = response['data']['role'];

        final perms = response['data']['permissions'] as List<dynamic>?;
        if (perms != null) {
          _permissions = perms.map((e) => e.toString()).toList();
        }

        String roleName = 'SELLER';
        if (roleData != null && roleData is Map<String, dynamic>) {
          roleName = roleData['display_name'] ?? roleData['name'] ?? 'SELLER';
        }

        _currentUser = UserModel(
          id: userData['id'],
          name: userData['name'],
          email: userData['email'],
          phone: userData['phone'],
          role: roleName,
          token: _token!,
          avatar: userData['avatar'] ?? userData['google_avatar'],
        );

        await StorageService.saveUser(_currentUser!);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Login failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> forgotPassword(String email) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.forgotPassword(email);
      if (response['success'] == true) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Failed to send reset OTP';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> resetPassword(String email, String otp, String newPassword, String newPasswordConfirmation) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.resetPassword(email, otp, newPassword, newPasswordConfirmation);
      if (response['success'] == true) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Password reset failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> changePassword(String currentPassword, String newPassword, String newPasswordConfirmation) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.changePassword(currentPassword, newPassword, newPasswordConfirmation);
      if (response['success'] == true) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response['message'] ?? 'Password change failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> getCurrentUser() async {
    try {
      final response = await _apiService.getCurrentUser();
      if (response['success'] == true) {
        final userData = response['data']['user'];
        final roleData = response['data']['role'];
        final perms = response['data']['permissions'] as List<dynamic>?;
        if (perms != null) {
          _permissions = perms.map((e) => e.toString()).toList();
        }

        String roleName = 'SELLER';
        if (roleData != null && roleData is Map<String, dynamic>) {
          roleName = roleData['display_name'] ?? roleData['name'] ?? 'SELLER';
        }

        _currentUser = UserModel(
          id: userData['id'],
          name: userData['name'],
          email: userData['email'],
          phone: userData['phone'],
          role: roleName,
          token: _token!,
          avatar: userData['google_avatar'] ?? userData['avatar'],
        );
        await StorageService.saveUser(_currentUser!);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error getting current user: $e');
    }
  }

  Future<void> logout() async {
    try {
      await _apiService.logout();
    } catch (e) {
      debugPrint('Logout error: $e');
    } finally {
      _token = null;
      _currentUser = null;
      _permissions = null;
      await StorageService.clearAll();
      notifyListeners();
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}