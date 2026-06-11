import 'dart:io';
import 'package:dio/dio.dart';
import 'package:logger/logger.dart';
import '../config/app_config.dart';
import 'storage_service.dart';

class ApiService {
  late final Dio _dio;
  final Logger _logger = Logger();

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (options.extra['requiresAuth'] == true) {
          final token = await StorageService.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        _logger.e('Dio error: ${error.message}');
        return handler.next(error);
      },
    ));
  }

  // ==================== GENERIC REQUEST ====================
  Future<Map<String, dynamic>> _request(
      String endpoint,
      String method, {
        Map<String, dynamic>? data,
        Map<String, dynamic>? queryParams,
        bool requiresAuth = false,
      }) async {
    try {
      Response response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await _dio.get(
            endpoint,
            queryParameters: queryParams,
            options: Options(extra: {'requiresAuth': requiresAuth}),
          );
          break;
        case 'POST':
          response = await _dio.post(
            endpoint,
            data: data,
            queryParameters: queryParams,
            options: Options(extra: {'requiresAuth': requiresAuth}),
          );
          break;
        case 'PUT':
          response = await _dio.put(
            endpoint,
            data: data,
            queryParameters: queryParams,
            options: Options(extra: {'requiresAuth': requiresAuth}),
          );
          break;
        case 'PATCH':
          response = await _dio.patch(
            endpoint,
            data: data,
            queryParameters: queryParams,
            options: Options(extra: {'requiresAuth': requiresAuth}),
          );
          break;
        case 'DELETE':
          response = await _dio.delete(
            endpoint,
            queryParameters: queryParams,
            options: Options(extra: {'requiresAuth': requiresAuth}),
          );
          break;
        default:
          throw Exception('Invalid HTTP method');
      }

      if (response.statusCode! >= 200 && response.statusCode! < 300) {
        return response.data as Map<String, dynamic>;
      } else {
        return {
          'success': false,
          'message': response.data['message'] ?? 'Request failed (${response.statusCode})',
        };
      }
    } on DioException catch (e) {
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'Network error: ${e.message}',
      };
    } catch (e) {
      return {'success': false, 'message': 'Unexpected error: ${e.toString()}'};
    }
  }

  // ==================== MULTIPART FILE UPLOAD ====================
  Future<Map<String, dynamic>> _requestWithFile(
      String endpoint,
      String method,
      Map<String, dynamic> fields,
      File? imageFile, {
        bool requiresAuth = false,
      }) async {
    try {
      final formData = FormData();
      fields.forEach((key, value) {
        if (value != null) {
          formData.fields.add(MapEntry(key, value.toString()));
        }
      });

      if (imageFile != null) {
        final file = await MultipartFile.fromFile(
          imageFile.path,
          filename: imageFile.path.split('/').last,
        );
        formData.files.add(MapEntry('image_file', file));
      }

      final response = await _dio.request(
        endpoint,
        data: formData,
        options: Options(
          method: method,
          extra: {'requiresAuth': requiresAuth},
          headers: {'Content-Type': 'multipart/form-data'},
        ),
      );

      if (response.statusCode! >= 200 && response.statusCode! < 300) {
        return response.data as Map<String, dynamic>;
      } else {
        return {
          'success': false,
          'message': response.data['message'] ?? 'Request failed',
        };
      }
    } on DioException catch (e) {
      return {
        'success': false,
        'message': e.response?.data['message'] ?? 'Network error: ${e.message}',
      };
    } catch (e) {
      return {'success': false, 'message': 'Request failed: ${e.toString()}'};
    }
  }

  // ==================== AUTH (v1) ====================
  Future<Map<String, dynamic>> register(Map<String, dynamic> data) async {
    return await _request('/v1/auth/register', 'POST', data: data);
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    return await _request('/v1/auth/login', 'POST', data: {'email': email, 'password': password});
  }

  Future<Map<String, dynamic>> verifyOTP(String email, String otp) async {
    return await _request('/v1/auth/verify-otp', 'POST', data: {'email': email, 'otp': otp});
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    return await _request('/v1/auth/forgot-password', 'POST', data: {'email': email});
  }

  Future<Map<String, dynamic>> resetPassword(
      String email,
      String otp,
      String password,
      String passwordConfirmation,
      ) async {
    return await _request('/v1/auth/reset-password', 'POST', data: {
      'email': email,
      'otp': otp,
      'password': password,
      'password_confirmation': passwordConfirmation,
    });
  }

  Future<Map<String, dynamic>> logout() async {
    return await _request('/v1/auth/logout', 'POST', requiresAuth: true);
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    return await _request('/v1/auth/me', 'GET', requiresAuth: true);
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    return await _request('/v1/auth/profile', 'PUT', data: data, requiresAuth: true);
  }

  Future<Map<String, dynamic>> changePassword(
      String currentPassword,
      String password,
      String passwordConfirmation,
      ) async {
    return await _request('/v1/auth/change-password', 'POST', data: {
      'current_password': currentPassword,
      'password': password,
      'password_confirmation': passwordConfirmation,
    }, requiresAuth: true);
  }

  Future<Map<String, dynamic>> googleRedirect(String role) async {
    return await _request('/v1/auth/google/redirect', 'GET', queryParams: {'role': role});
  }

  Future<Map<String, dynamic>> getPermissions() async {
    return await _request('/v1/auth/permissions', 'GET', requiresAuth: true);
  }

  // ==================== PRODUCT CATEGORIES (v2) ====================
  Future<Map<String, dynamic>> getCategories({Map<String, dynamic>? params}) async {
    return await _request('/v2/product-categories', 'GET', queryParams: params, requiresAuth: true);
  }

  Future<Map<String, dynamic>> getCategoriesDropdown({Map<String, dynamic>? params}) async {
    return await _request('/v2/product-categories/dropdown', 'GET',
        queryParams: params, requiresAuth: true);
  }

  Future<Map<String, dynamic>> getCategory(String id) async {
    return await _request('/v2/product-categories/$id', 'GET', requiresAuth: true);
  }

  Future<Map<String, dynamic>> createCategory(Map<String, dynamic> data) async {
    return await _request('/v2/product-categories', 'POST', data: data, requiresAuth: true);
  }

  Future<Map<String, dynamic>> updateCategory(String id, Map<String, dynamic> data) async {
    return await _request('/v2/product-categories/$id', 'PUT', data: data, requiresAuth: true);
  }

  Future<Map<String, dynamic>> deleteCategory(String id) async {
    return await _request('/v2/product-categories/$id', 'DELETE', requiresAuth: true);
  }

  Future<Map<String, dynamic>> activateCategory(String id) async {
    return await _request('/v2/product-categories/$id/activate', 'PATCH', requiresAuth: true);
  }

  Future<Map<String, dynamic>> deactivateCategory(String id) async {
    return await _request('/v2/product-categories/$id/deactivate', 'PATCH', requiresAuth: true);
  }

  Future<Map<String, dynamic>> toggleCategoryStatus(String id) async {
    return await _request('/v2/product-categories/$id/toggle-status', 'PATCH', requiresAuth: true);
  }

  // ==================== PRODUCTS (v3) ====================
  Future<Map<String, dynamic>> getProductsDropdown({Map<String, dynamic>? params}) async {
    return await _request('/v3/products/dropdown', 'GET', queryParams: params, requiresAuth: true);
  }


  Future<Map<String, dynamic>> getProducts({Map<String, dynamic>? params}) async {
    return await _request('/v3/products', 'GET', queryParams: params, requiresAuth: true);
  }

  Future<Map<String, dynamic>> getProduct(String id) async {
    return await _request('/v3/products/$id', 'GET', requiresAuth: true);
  }

  Future<Map<String, dynamic>> createProduct(Map<String, dynamic> data, {File? imageFile}) async {
    if (imageFile != null) {
      return await _requestWithFile('/v3/products', 'POST', data, imageFile, requiresAuth: true);
    } else {
      return await _request('/v3/products', 'POST', data: data, requiresAuth: true);
    }
  }

  Future<Map<String, dynamic>> updateProduct(String id, Map<String, dynamic> data, {File? imageFile}) async {
    if (imageFile != null) {
      return await _requestWithFile('/v3/products/$id', 'POST', data, imageFile, requiresAuth: true);
    } else {
      return await _request('/v3/products/$id', 'PUT', data: data, requiresAuth: true);
    }
  }

  Future<Map<String, dynamic>> deleteProduct(String id) async {
    return await _request('/v3/products/$id', 'DELETE', requiresAuth: true);
  }

  Future<Map<String, dynamic>> restoreProduct(String id) async {
    return await _request('/v3/products/$id/restore', 'PATCH', requiresAuth: true);
  }

  Future<Map<String, dynamic>> forceDeleteProduct(String id) async {
    return await _request('/v3/products/$id/force', 'DELETE', requiresAuth: true);
  }

  Future<Map<String, dynamic>> changeProductStatus(String id, String status) async {
    return await _request('/v3/products/$id/status', 'PATCH', data: {'status': status}, requiresAuth: true);
  }

  // Scanner endpoints
  Future<Map<String, dynamic>> scanByImei(String imei) async {
    return await _request('/v3/products/scan/imei/$imei', 'GET', requiresAuth: true);
  }

  Future<Map<String, dynamic>> scanImeiPost(String imei) async {
    return await _request('/v3/products/scan/imei', 'POST', data: {'imei': imei}, requiresAuth: true);
  }

  Future<Map<String, dynamic>> assignImei(String id, String imei) async {
    return await _request('/v3/products/$id/assign-imei', 'PATCH', data: {'imei': imei}, requiresAuth: true);
  }

  // ==================== DASHBOARD (v14) ====================
  Future<Map<String, dynamic>> getDashboardAnalytics([Map<String, dynamic>? params]) async {
    return await _request('/v14/analytics/dashboard', 'GET', queryParams: params, requiresAuth: true);
  }
}