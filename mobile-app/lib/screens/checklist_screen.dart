import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/guard.dart';
import 'mark_attendance_screen.dart';
import 'login_screen.dart';

class ChecklistScreen extends StatefulWidget {
  const ChecklistScreen({super.key});

  @override
  State<ChecklistScreen> createState() => _ChecklistScreenState();
}

class _ChecklistScreenState extends State<ChecklistScreen> {
  List<GuardModel> _guards = [];
  bool _isLoading = true;
  String? _error;
  String _filter = 'ALL';

  @override
  void initState() {
    super.initState();
    _fetchChecklist();
  }

  Future<void> _fetchChecklist() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final list = await ApiService.getOfficerGuardsChecklist();
      setState(() {
        _guards = list;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _handleLogout() async {
    await ApiService.logout();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  List<GuardModel> get _filteredGuards {
    if (_filter == 'PENDING') {
      return _guards.where((g) => g.attendanceStatus == 'PENDING').toList();
    } else if (_filter == 'DONE') {
      return _guards.where((g) => g.attendanceStatus != 'PENDING').toList();
    }
    return _guards;
  }

  @override
  Widget build(BuildContext context) {
    const slate300 = Color(0xFFCBD5E1);
    const slate400 = Color(0xFF94A3B8);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Today\'s Guard Checklist', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: const Color(0xFF1E293B),
        elevation: 2,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF0284C7)),
            onPressed: _fetchChecklist,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          Container(
            color: const Color(0xFF1E293B),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildFilterChip('ALL', 'All (${_guards.length})'),
                const SizedBox(width: 8),
                _buildFilterChip('PENDING', 'Pending (${_guards.where((g) => g.attendanceStatus == 'PENDING').length})'),
                const SizedBox(width: 8),
                _buildFilterChip('DONE', 'Completed (${_guards.where((g) => g.attendanceStatus != 'PENDING').length})'),
              ],
            ),
          ),

          // Body Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF0284C7)))
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
                              const SizedBox(height: 12),
                              Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: slate300)),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchChecklist,
                                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0284C7)),
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _filteredGuards.isEmpty
                        ? const Center(
                            child: Text(
                              'No guards assigned for this filter.',
                              style: TextStyle(color: slate400),
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _fetchChecklist,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _filteredGuards.length,
                              itemBuilder: (context, index) {
                                final guard = _filteredGuards[index];
                                return _buildGuardCard(guard);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filterKey, String label) {
    const slate300 = Color(0xFFCBD5E1);
    final isSelected = _filter == filterKey;
    return ChoiceChip(
      label: Text(label, style: TextStyle(color: isSelected ? Colors.white : slate300, fontSize: 12)),
      selected: isSelected,
      selectedColor: const Color(0xFF0284C7),
      backgroundColor: const Color(0xFF0F172A),
      onSelected: (selected) {
        if (selected) setState(() => _filter = filterKey);
      },
    );
  }

  Widget _buildGuardCard(GuardModel guard) {
    const slate300 = Color(0xFFCBD5E1);
    const slate400 = Color(0xFF94A3B8);
    const emeraldColor = Color(0xFF10B981);

    final bool isCheckedOut = guard.attendanceStatus == 'CHECKED_OUT';
    final bool isCheckedIn = guard.attendanceStatus == 'CHECKED_IN';

    return Card(
      color: const Color(0xFF1E293B),
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => MarkAttendanceScreen(guard: guard),
            ),
          );
          _fetchChecklist();
        },
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      guard.guardName,
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                  _buildStatusBadge(guard.attendanceStatus),
                ],
              ),
              const SizedBox(height: 8),

              Row(
                children: [
                  const Icon(Icons.location_on, size: 14, color: Color(0xFF0284C7)),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      'Post: ${guard.post.name} (Within ${guard.post.allowedRadiusMetres}m)',
                      style: const TextStyle(color: slate300, fontSize: 12),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),

              Row(
                children: [
                  const Icon(Icons.access_time, size: 14, color: Colors.indigoAccent),
                  const SizedBox(width: 4),
                  Text(
                    'Shift: ${guard.shift.name} (${guard.shift.startTime} - ${guard.shift.endTime})',
                    style: const TextStyle(color: slate400, fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    isCheckedOut
                        ? 'Completed'
                        : isCheckedIn
                            ? 'Tap to Mark Check-Out →'
                            : 'Tap to Mark Check-In →',
                    style: TextStyle(
                      color: isCheckedOut
                          ? emeraldColor
                          : isCheckedIn
                              ? Colors.amber
                              : const Color(0xFF0284C7),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bg = Colors.amber.withValues(alpha: 0.15);
    Color border = Colors.amber;
    Color text = Colors.amberAccent;
    String label = 'PENDING';

    if (status == 'APPROVED') {
      bg = const Color(0xFF10B981).withValues(alpha: 0.15);
      border = const Color(0xFF10B981);
      text = const Color(0xFF34D399);
      label = 'APPROVED';
    } else if (status == 'PENDING_REVIEW') {
      bg = Colors.amber.withValues(alpha: 0.2);
      border = Colors.amber;
      text = Colors.amberAccent;
      label = 'PENDING REVIEW';
    } else if (status == 'REJECTED') {
      bg = Colors.red.withValues(alpha: 0.15);
      border = Colors.red;
      text = Colors.redAccent;
      label = 'REJECTED';
    } else if (status == 'CHECKED_IN') {
      bg = const Color(0xFF0284C7).withValues(alpha: 0.15);
      border = const Color(0xFF0284C7);
      text = const Color(0xFF38BDF8);
      label = 'CHECKED IN';
    } else if (status == 'CHECKED_OUT') {
      bg = const Color(0xFF10B981).withValues(alpha: 0.15);
      border = const Color(0xFF10B981);
      text = const Color(0xFF34D399);
      label = 'CHECKED OUT';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border),
      ),
      child: Text(
        label,
        style: TextStyle(color: text, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
