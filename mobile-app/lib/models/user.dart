class UserModel {
  final int id;
  final String name;
  final String mobile;
  final String role;
  final bool mustChangePassword;

  UserModel({
    required this.id,
    required this.name,
    required this.mobile,
    required this.role,
    required this.mustChangePassword,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      name: json['name'] ?? '',
      mobile: json['mobile'] ?? '',
      role: json['role'] ?? 'OFFICER',
      mustChangePassword: json['mustChangePassword'] ?? false,
    );
  }
}
