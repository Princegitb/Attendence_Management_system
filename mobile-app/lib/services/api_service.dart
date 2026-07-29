import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/guard.dart';

class ApiService {
  static String get baseUrl {
    return 'https://attendence-management-system-8hkm.onrender.com/api';
  }

  static const _storage = FlutterSecureStorage();

  static Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
  }

  static Future<String?> getAccessToken() async {
    return await _storage.read(key: 'access_token');
  }

  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: 'refresh_token');
  }

  static Future<String?> refreshAccessToken() async {
    final refreshTok = await getRefreshToken();
    if (refreshTok == null) return null;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshTok}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          final newAccess = data['data']['accessToken'];
          final newRefresh = data['data']['refreshToken'] ?? refreshTok;
          await saveTokens(newAccess, newRefresh);
          return newAccess;
        }
      }
    } catch (e) {
      if (kDebugMode) print('Token refresh failed: $e');
    }
    return null;
  }

  static Future<void> logout() async {
    try {
      final token = await getAccessToken();
      final refreshTok = await getRefreshToken();
      if (token != null && refreshTok != null) {
        await http.post(
          Uri.parse('$baseUrl/auth/logout'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode({'refreshToken': refreshTok}),
        ).timeout(const Duration(seconds: 3));
      }
    } catch (e) {
      if (kDebugMode) print('Server logout warning: $e');
    }
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }

  static Map<String, dynamic> _parseJsonResponse(http.Response response) {
    try {
      return jsonDecode(response.body);
    } catch (e) {
      throw Exception('Server returned invalid response (Status ${response.statusCode}). Ensure backend server is active.');
    }
  }

  static Future<http.Response> _sendRequest(
    String method,
    String url, {
    Map<String, String>? headers,
    Object? body,
    bool isRetry = false,
  }) async {
    String? token = await getAccessToken();
    if (token == null) {
      token = await refreshAccessToken();
      if (token == null) {
        throw Exception('Session expired. Please log in again.');
      }
    }

    final reqHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
      ...?(headers),
    };

    http.Response response;
    final uri = Uri.parse(url);
    if (method == 'POST') {
      response = await http.post(uri, headers: reqHeaders, body: body);
    } else {
      response = await http.get(uri, headers: reqHeaders);
    }

    if ((response.statusCode == 401 || response.statusCode == 403) && !isRetry) {
      final newToken = await refreshAccessToken();
      if (newToken != null) {
        return _sendRequest(method, url, headers: headers, body: body, isRetry: true);
      } else {
        throw Exception('Session expired. Please log in again.');
      }
    }

    return response;
  }

  static Future<Map<String, dynamic>> login(String mobile, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'mobile': mobile, 'password': password}),
    );

    final data = _parseJsonResponse(response);
    if (response.statusCode == 200 && data['success'] == true) {
      await saveTokens(data['data']['accessToken'], data['data']['refreshToken']);
    }
    return data;
  }

  static Future<Map<String, dynamic>> changePassword(String oldPassword, String newPassword) async {
    final response = await _sendRequest(
      'POST',
      '$baseUrl/auth/change-password',
      body: jsonEncode({'oldPassword': oldPassword, 'newPassword': newPassword}),
    );
    return _parseJsonResponse(response);
  }

  static Future<List<GuardModel>> getOfficerGuardsChecklist() async {
    final response = await _sendRequest('GET', '$baseUrl/officers/guards');
    final data = _parseJsonResponse(response);
    if (response.statusCode == 200 && data['success'] == true) {
      final List list = data['data']['guards'] ?? [];
      return list.map((item) => GuardModel.fromJson(item)).toList();
    } else {
      throw Exception(data['message'] ?? 'Failed to load guard checklist');
    }
  }

  static Future<Map<String, dynamic>> markAttendance({
    required int guardId,
    required bool isCheckIn,
    required double latitude,
    required double longitude,
    required double gpsAccuracy,
    File? photoFile,
    Uint8List? photoBytes,
    bool isRetry = false,
  }) async {
    String? token = await getAccessToken();
    if (token == null) {
      token = await refreshAccessToken();
      if (token == null) {
        throw Exception('Session expired. Please log in again.');
      }
    }

    final endpoint = isCheckIn ? '$baseUrl/attendance/check-in' : '$baseUrl/attendance/check-out';
    final request = http.MultipartRequest('POST', Uri.parse(endpoint));
    request.headers['Authorization'] = 'Bearer $token';

    request.fields['guard_id'] = guardId.toString();
    request.fields['latitude'] = latitude.toString();
    request.fields['longitude'] = longitude.toString();
    request.fields['gps_accuracy'] = gpsAccuracy.toString();

    if (photoBytes != null) {
      request.files.add(
        http.MultipartFile.fromBytes('photo', photoBytes, filename: 'guard_photo.jpg'),
      );
    } else if (photoFile != null) {
      request.files.add(
        await http.MultipartFile.fromPath('photo', photoFile.path),
      );
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if ((response.statusCode == 401 || response.statusCode == 403) && !isRetry) {
      final newToken = await refreshAccessToken();
      if (newToken != null) {
        return markAttendance(
          guardId: guardId,
          isCheckIn: isCheckIn,
          latitude: latitude,
          longitude: longitude,
          gpsAccuracy: gpsAccuracy,
          photoFile: photoFile,
          photoBytes: photoBytes,
          isRetry: true,
        );
      } else {
        throw Exception('Session expired. Please log in again.');
      }
    }

    return _parseJsonResponse(response);
  }
}
