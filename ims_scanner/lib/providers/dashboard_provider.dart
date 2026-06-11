import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/dashboard_models.dart';

class DashboardProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  DashboardAnalytics? _analytics;
  bool _isLoading = false;
  String? _errorMessage;

  // Period filter state
  String _period = ''; // '', 'daily', 'monthly', 'yearly'
  DateTime? _date;

  DashboardAnalytics? get analytics => _analytics;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get period => _period;
  DateTime? get date => _date;

  void setPeriod(String period, {DateTime? date}) {
    _period = period;
    _date = date ?? (period.isNotEmpty ? DateTime.now() : null);
    fetchAnalytics();
  }

  void setDate(DateTime date) {
    _date = date;
    fetchAnalytics();
  }

  Future<void> fetchAnalytics() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final Map<String, dynamic> params = {};
      if (_period.isNotEmpty) params['period'] = _period;
      if (_date != null) {
        if (_period == 'daily') params['date'] = _date!.toIso8601String().split('T')[0];
        else if (_period == 'monthly') params['date'] = _date!.toIso8601String().substring(0, 7);
        else if (_period == 'yearly') params['date'] = _date!.year.toString();
      }

      final response = await _apiService.getDashboardAnalytics(params);
      if (response['success'] == true) {
        _analytics = DashboardAnalytics.fromJson(response['data']);
        _errorMessage = null;
      } else {
        _errorMessage = response['message'] ?? 'Failed to load dashboard data';
        _analytics = null;
      }
    } catch (e) {
      _errorMessage = e.toString();
      _analytics = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}