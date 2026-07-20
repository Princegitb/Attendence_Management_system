class PostModel {
  final int id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final int allowedRadiusMetres;

  PostModel({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.allowedRadiusMetres,
  });

  factory PostModel.fromJson(Map<String, dynamic> json) {
    return PostModel(
      id: json['id'],
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      allowedRadiusMetres: json['allowedRadiusMetres'] ?? 100,
    );
  }
}

class ShiftModel {
  final int id;
  final String name;
  final String startTime;
  final String endTime;

  ShiftModel({
    required this.id,
    required this.name,
    required this.startTime,
    required this.endTime,
  });

  factory ShiftModel.fromJson(Map<String, dynamic> json) {
    return ShiftModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      startTime: json['startTime'] ?? '',
      endTime: json['endTime'] ?? '',
    );
  }
}

class GuardModel {
  final int guardId;
  final String guardName;
  final String? guardMobile;
  final PostModel post;
  final ShiftModel shift;
  String attendanceStatus; // PENDING, CHECKED_IN, CHECKED_OUT
  String? checkInTime;
  String? checkOutTime;

  GuardModel({
    required this.guardId,
    required this.guardName,
    this.guardMobile,
    required this.post,
    required this.shift,
    required this.attendanceStatus,
    this.checkInTime,
    this.checkOutTime,
  });

  factory GuardModel.fromJson(Map<String, dynamic> json) {
    final att = json['attendance'] ?? {};
    return GuardModel(
      guardId: json['guardId'],
      guardName: json['guardName'] ?? '',
      guardMobile: json['guardMobile'],
      post: PostModel.fromJson(json['post']),
      shift: ShiftModel.fromJson(json['shift'] ?? {}),
      attendanceStatus: att['status'] ?? 'PENDING',
      checkInTime: att['checkInTime'],
      checkOutTime: att['checkOutTime'],
    );
  }
}
