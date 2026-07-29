import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image/image.dart' as img;
import '../models/guard.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';

class MarkAttendanceScreen extends StatefulWidget {
  final GuardModel guard;
  const MarkAttendanceScreen({super.key, required this.guard});

  @override
  State<MarkAttendanceScreen> createState() => _MarkAttendanceScreenState();
}

class _MarkAttendanceScreenState extends State<MarkAttendanceScreen> {
  CameraController? _cameraController;
  List<CameraDescription>? _cameras;
  bool _isCameraInitialized = false;
  File? _capturedImage;
  Uint8List? _webImageBytes;

  Position? _currentPosition;
  bool _isSubmitting = false;
  bool _permissionPermanentlyDenied = false;

  String? _serverError;
  String? _successMsg;
  bool _autoApproved = true; // assume auto-approved until backend says otherwise

  @override
  void initState() {
    super.initState();
    _initCameraAndLocation();
  }

  Future<void> _initCameraAndLocation() async {
    _acquireLocation();

    try {
      _cameras = await availableCameras();
      if (_cameras != null && _cameras!.isNotEmpty) {
        final backCamera = _cameras!.firstWhere(
          (c) => c.lensDirection == CameraLensDirection.back,
          orElse: () => _cameras!.first,
        );

        _cameraController = CameraController(
          backCamera,
          ResolutionPreset.medium,
          enableAudio: false,
        );

        await _cameraController!.initialize();
        if (mounted) {
          setState(() {
            _isCameraInitialized = true;
          });
        }
      }
    } catch (e) {
      debugPrint('Camera init error: $e');
    }
  }

  Future<void> _acquireLocation() async {
    setState(() {
      _serverError = null;
      _permissionPermanentlyDenied = false;
    });

    try {
      final pos = await LocationService.getCurrentLocation();
      setState(() {
        _currentPosition = pos;
      });
    } catch (e) {
      final errorMsg = e.toString().replaceFirst('Exception: ', '');
      setState(() {
        if (errorMsg == 'LOCATION_PERMANENTLY_DENIED') {
          _serverError = 'Location permissions are permanently denied. Please allow them in settings.';
          _permissionPermanentlyDenied = true;
        } else {
          _serverError = errorMsg;
        }
      });
    }
  }

  Future<Uint8List> _compressImage(File file) async {
    final bytes = await file.readAsBytes();
    final decoded = img.decodeImage(bytes);
    if (decoded == null) return bytes;
    img.Image resized = decoded;
    if (decoded.width > 1024) {
      resized = img.copyResize(decoded, width: 1024);
    }
    return Uint8List.fromList(img.encodeJpg(resized, quality: 80));
  }

  Future<void> _takePhoto() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;

    try {
      final image = await _cameraController!.takePicture();
      if (kIsWeb) {
        final bytes = await image.readAsBytes();
        setState(() {
          _capturedImage = File(image.path);
          _webImageBytes = bytes;
        });
      } else {
        final file = File(image.path);
        final compressedBytes = await _compressImage(file);
        await file.writeAsBytes(compressedBytes);
        setState(() {
          _capturedImage = file;
          _serverError = null;
        });
      }
    } catch (e) {
      setState(() {
        _serverError = 'Error capturing photo: ${e.toString()}';
      });
    }
  }

  void _submitAttendance() async {
    if (_isSubmitting) return;

    if (_capturedImage == null && _webImageBytes == null) {
      setState(() => _serverError = 'Please capture a live photo of the guard using the camera.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _serverError = null;
      _successMsg = null;
      _permissionPermanentlyDenied = false;
    });

    // Fetch fresh GPS coordinates right before submission
    try {
      final pos = await LocationService.getCurrentLocation();
      setState(() {
        _currentPosition = pos;
      });
    } catch (e) {
      final errorMsg = e.toString().replaceFirst('Exception: ', '');
      setState(() {
        if (errorMsg == 'LOCATION_PERMANENTLY_DENIED') {
          _serverError = 'Location permissions are permanently denied. Please allow them in settings.';
          _permissionPermanentlyDenied = true;
        } else {
          _serverError = 'Could not acquire fresh GPS: $errorMsg';
        }
        _isSubmitting = false;
      });
      return;
    }

    try {
      final isCheckIn = widget.guard.checkInTime == null && widget.guard.attendanceStatus == 'PENDING';
      final res = await ApiService.markAttendance(
        guardId: widget.guard.guardId,
        isCheckIn: isCheckIn,
        latitude: _currentPosition!.latitude,
        longitude: _currentPosition!.longitude,
        gpsAccuracy: _currentPosition!.accuracy,
        photoFile: _capturedImage,
        photoBytes: _webImageBytes,
      );

      if (res['success'] == true) {
        setState(() {
          _successMsg = res['message'];
          // Backend signals whether the operation was auto-approved.
          // For a check-in, autoApproved=false means PENDING_REVIEW (manager action needed).
          // For a check-out, autoApproved is always true.
          _autoApproved = res['data']?['autoApproved'] == true;
        });
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) Navigator.pop(context);
        });
      } else {
        setState(() {
          _serverError = res['message'] ?? 'Attendance submission failed.';
        });
      }
    } catch (e) {
      setState(() {
        _serverError = 'Server error: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  Widget _buildImagePreview() {
    if (kIsWeb && _webImageBytes != null) {
      return Image.memory(_webImageBytes!, fit: BoxFit.cover);
    }
    if (_capturedImage != null) {
      if (kIsWeb) {
        return Image.network(_capturedImage!.path, fit: BoxFit.cover);
      }
      return Image.file(_capturedImage!, fit: BoxFit.cover);
    }
    if (_isCameraInitialized) {
      return CameraPreview(_cameraController!);
    }
    return Container(
      color: Colors.black,
      child: const Center(
        child: CircularProgressIndicator(color: Color(0xFF0284C7)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const slate400 = Color(0xFF94A3B8);
    const emeraldColor = Color(0xFF10B981);
    const emeraldAccent = Color(0xFF34D399);

    final isCheckIn = widget.guard.checkInTime == null && widget.guard.attendanceStatus == 'PENDING';
    final actionLabel = isCheckIn ? 'Mark Check-In' : 'Mark Check-Out';

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text(actionLabel, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: const Color(0xFF1E293B),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Guard & Post Details
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.guard.guardName,
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Assigned Post: ${widget.guard.post.name}',
                      style: const TextStyle(color: Color(0xFF0284C7), fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    Text(
                      'Max Radius: ${widget.guard.post.allowedRadiusMetres}m',
                      style: const TextStyle(color: slate400, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Server Error Banner
              if (_serverError != null)
                Container(
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.red.withValues(alpha: 0.5)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.redAccent),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _serverError!,
                              style: const TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                      if (_permissionPermanentlyDenied) ...[
                        const SizedBox(height: 10),
                        OutlinedButton(
                          onPressed: () => Geolocator.openAppSettings(),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.redAccent),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Open App Settings', style: TextStyle(color: Colors.white, fontSize: 11)),
                        )
                      ]
                    ],
                  ),
                ),

              // Success Banner — colour depends on whether backend auto-approved the action.
              if (_successMsg != null)
                Container(
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: (_autoApproved ? emeraldColor : Colors.amber).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: (_autoApproved ? emeraldColor : Colors.amber).withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _autoApproved ? Icons.check_circle_outline : Icons.info_outline,
                        color: _autoApproved ? emeraldAccent : Colors.amberAccent,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _successMsg!,
                          style: TextStyle(
                            color: _autoApproved ? emeraldAccent : Colors.amberAccent,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // GPS Status Card
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          _currentPosition != null ? Icons.gps_fixed : Icons.gps_not_fixed,
                          color: _currentPosition != null ? emeraldAccent : Colors.amber,
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _currentPosition != null
                              ? 'GPS Acquired (±${_currentPosition!.accuracy.toStringAsFixed(1)}m)'
                              : 'Acquiring GPS location...',
                          style: const TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, size: 18, color: Color(0xFF0284C7)),
                      onPressed: _acquireLocation,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              if (_currentPosition != null) ...[
                Builder(
                  builder: (context) {
                    final dist = Geolocator.distanceBetween(
                      _currentPosition!.latitude,
                      _currentPosition!.longitude,
                      widget.guard.post.latitude,
                      widget.guard.post.longitude,
                    );
                    final isWithin = dist <= widget.guard.post.allowedRadiusMetres;
                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isWithin
                            ? const Color(0xFF064E3B).withValues(alpha: 0.15)
                            : const Color(0xFF7F1D1D).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isWithin ? const Color(0xFF047857) : const Color(0xFFB91C1C),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isWithin ? Icons.check_circle_outline : Icons.warning_amber_outlined,
                            color: isWithin ? emeraldAccent : Colors.redAccent,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              isWithin
                                  ? 'Within Range: You are ${dist.toStringAsFixed(1)}m from post.'
                                  : 'OUT OF RANGE: You are ${dist.toStringAsFixed(1)}m from post (Max: ${widget.guard.post.allowedRadiusMetres}m).',
                              style: TextStyle(
                                color: isWithin ? emeraldAccent : Colors.redAccent,
                                fontSize: 12,
                                fontWeight: FontWeight.bold
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }
                ),
                const SizedBox(height: 16),
              ],

              // Camera Viewport / Preview Box
              const Text(
                'LIVE REAR CAMERA CAPTURE (PROOFS)',
                style: TextStyle(color: slate400, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
              ),
              const SizedBox(height: 8),

              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: AspectRatio(
                  aspectRatio: 4 / 3,
                  child: _buildImagePreview(),
                ),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _takePhoto,
                      icon: const Icon(Icons.camera_alt, color: Color(0xFF0284C7)),
                      label: Text((_capturedImage == null && _webImageBytes == null) ? 'Capture Live Photo' : 'Retake Photo',
                          style: const TextStyle(color: Colors.white, fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: const BorderSide(color: Color(0xFF0284C7)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Submit Attendance Button
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submitAttendance,
                style: ElevatedButton.styleFrom(
                  backgroundColor: isCheckIn ? const Color(0xFF0284C7) : emeraldColor,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Text(
                        'SUBMIT ${actionLabel.toUpperCase()}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
