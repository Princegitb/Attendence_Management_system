import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/guard.dart';

class ApiService {
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api';
    }
    return 'http://10.186.22.176:5000/api';
  }

  static const _storage = FlutterSecureStorage();

  static Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
  }

  static Future<String?> getAccessToken() async {
    return await _storage.read(key: 'access_token');
  }

  static Future<void> logout() async {
    await _storage.deleteAll();
  }

  static Map<String, dynamic> _parseJsonResponse(http.Response response) {
    try {
      return jsonDecode(response.body);
    } catch (e) {
      throw Exception('Server returned invalid response (Status ${response.statusCode}). Ensure backend server is active on port 5000.');
    }
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
    final token = await getAccessToken();
    final response = await http.post(
      Uri.parse('$baseUrl/auth/change-password'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'oldPassword': oldPassword, 'newPassword': newPassword}),
    );
    return _parseJsonResponse(response);
  }

  static Future<List<GuardModel>> getOfficerGuardsChecklist() async {
    final token = await getAccessToken();
    final response = await http.get(
      Uri.parse('$baseUrl/officers/guards'),
      headers: {'Authorization': 'Bearer $token'},
    );

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
  }) async {
    final token = await getAccessToken();
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

    return _parseJsonResponse(response);
  }
}
