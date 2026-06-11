import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/user_model.dart';

class StorageService {
  static late SharedPreferences _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static Future<void> saveToken(String token) async {
    await _prefs.setString('auth_token', token);
  }

  static Future<String?> getToken() async {
    return _prefs.getString('auth_token');
  }

  static Future<void> saveUser(UserModel user) async {
    await _prefs.setString('user', jsonEncode(user.toJson()));
  }

  static Future<UserModel?> getUser() async {
    final userJson = _prefs.getString('user');
    if (userJson != null) {
      return UserModel.fromJson(jsonDecode(userJson));
    }
    return null;
  }

  static Future<void> clearAll() async {
    await _prefs.remove('auth_token');
    await _prefs.remove('user');
  }
}