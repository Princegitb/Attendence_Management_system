import 'package:flutter_test/flutter_test.dart';
import 'package:guard_attendance_mobile/main.dart';

void main() {
  testWidgets('App loads test', (WidgetTester tester) async {
    await tester.pumpWidget(const GuardAttendanceApp());
    expect(find.byType(GuardAttendanceApp), findsOneWidget);
  });
}
