# 🛡️ Smart Guard Attendance Management System

## Complete Client User Guide & Operational Manual

---

## 📌 Executive Summary & Core Benefits

This Guard Attendance Management System is a modern, GPS-enabled, photo-verified solution designed to streamline security workforce management, eliminate proxy attendance, and automate payroll-ready reporting.

### Why This System is Superior to Traditional Methods

1. **Zero Proxy / Buddy Punching**: Requires live photo verification at the moment of check-in and check-out.
2. **Strict GPS Geo-Fencing**: Guards can only be checked in when physically present within the approved radius (e.g., 100 meters) of their assigned post.
3. **Seamless Overnight Shift Support**: Automatically handles complex 24-hour and overnight/cross-midnight shifts (e.g., 8:00 PM to 4:00 AM) without data loss, date confusion, or manual date switching.
4. **Real-Time Operational Visibility**: Managers get instant visibility into on-duty guards, late check-ins, and unassigned posts from any web browser.
5. **Instant Payroll-Ready Reports**: Download fully formatted Excel/CSV attendance logs filtered by date range, location, or shift.

---

## 👥 System Roles & Permissions

The system operates via two user-friendly interfaces tailored for your team's hierarchy:

* **Web Management Dashboard (For Managers & Admins)**:
  * Used on desktop/laptop.
  * Full administrative control: Manage shifts, posts, guards, and field officers.
  * Monitor real-time, live attendance logs and review late arrivals.
  * Export official attendance reports.

* **Mobile Application (For Field Officers / Site Supervisors)**:
  * Used on Android smartphones on-site.
  * Displays a daily interactive roster/checklist of assigned guards.
  * Captures live photos and GPS coordinates for check-ins and check-outs.
  * Filter & search through hundreds of guards in seconds.

---

## 🚀 Step-by-Step Initial Setup Guide (For Managers)

To set up the system for your organization for the first time, follow these 5 simple steps in order:

```
[1. Create Shifts] ➔ [2. Create Posts/Locations] ➔ [3. Register Guards] ➔ [4. Add Field Officers] ➔ [5. Assign Officers]
```

### Step 1: Set Up Work Shifts

Go to **Shift Setup** in the Web Dashboard.

1. Click **Add New Shift**.
2. Enter the **Shift Name** (e.g., *Day Shift*, *Night Shift*).
3. Set the **Start Time** and **End Time** (e.g., `08:00 AM` to `04:00 PM` or `08:00 PM` to `04:00 AM`).
4. Set a **Grace Period** in minutes (e.g., `15 minutes`).
   * *Note: Guards checking in after this grace period will be flagged for Manager Review.*

### Step 2: Create Posts (Guard Duty Locations)

Go to **Posts & Leaflet Map** in the Web Dashboard.

1. Click **Add New Post**.
2. Enter the **Post Name** (e.g., *Main Gate - HQ*, *Warehouse Block B*).
3. Enter the physical **Address**.
4. Set the exact **Latitude & Longitude** (you can click directly on the interactive map).
5. Define the **Allowed Radius** in meters (e.g., `100m`). Check-ins outside this circle will be blocked.

### Step 3: Register Guards

Go to **Guard Roster & Bulk Import** in the Web Dashboard.

* **Option A: Add Single Guard**
  1. Click **Add Guard**.
  2. Enter Guard Name, Mobile Number, Assigned Post, and Assigned Shift.
* **Option B: Excel Bulk Import (Fastest for Large Workforce)**
  1. Click **Download Excel Template**.
  2. Fill in your guard list into the spreadsheet.
  3. Upload the completed Excel file to import hundreds of guards instantly.

### Step 4: Add Field Officers (Supervisors)

Go to **Field Officers** in the Web Dashboard.

1. Click **Add Field Officer**.
2. Enter Officer Name and Mobile Number.
3. Set an initial password. The officer will use this mobile number and password to log into the mobile app.

### Step 5: Assign Field Officers to Posts/Guards

Go to **Officer Assignments** in the Web Dashboard.

1. Select the **Field Officer**.
2. Link them to specific **Posts** or **Guards**.
3. Now, whenever the officer opens the mobile app, they will automatically see all guards at their assigned posts!

---

## 📱 Daily Operational Workflow

### 1. On-Site Guard Check-In (Field Officer Mobile App)

1. The Field Officer opens the app and logs in.
2. The **Roster Checklist** automatically displays guards due for check-in.
3. The officer can use the **Search Bar** or **Post/Shift Dropdown Filters** to quickly find a guard.
4. The officer taps the guard's name and clicks **Mark Check-In**:
   * The app verifies that the officer & guard are physically within the GPS boundary.
   * The officer takes a **live photo/selfie** of the guard.
   * **Auto-Approval**: If on-time and at the correct location, the system automatically approves the check-in and moves the guard to the "Check Out" tab.

### 2. On-Site Guard Check-Out (Field Officer Mobile App)

1. At the end of the shift, the officer opens the **Check Out** tab.
2. Taps on the guard and takes a **live check-out photo**.
3. The shift attendance is completed!

### 3. Handling Overnight Shifts (Automatic 24/7 Support)

* If a guard is assigned to a night shift (e.g., 8:00 PM to 4:00 AM):
  * **Before Midnight**: Guard checks in at 8:00 PM.
  * **After Midnight**: At 2:00 AM or 4:00 AM, the system automatically recognizes that the guard is in the middle of an overnight shift.
  * The guard **remains in the "Check Out" tab** and does NOT vanish after 12:00 AM.
  * The officer simply taps "Check Out" at 4:00 AM, and the record updates seamlessly.

### 4. Manager Review & Exception Handling (Web Dashboard)

Go to **Attendance Monitor** in the Web Dashboard.

* **On-Time Check-Ins**: Automatically marked as `APPROVED`.
* **Late Check-Ins**: Automatically flagged as `PENDING_REVIEW` for manager approval.
* **Manual Correction**: If a guard was late due to an approved emergency, the Manager can click **Correct Status**, select *APPROVED*, and enter a mandatory reason note for record-keeping.

---

## 📊 Generating Reports

Go to **Reports Export** in the Web Dashboard.

1. Select the **Start Date** and **End Date**.
2. Click **Export CSV Report**.
3. The system generates an Excel-compatible spreadsheet with complete details:
   * Date & Guard Name
   * Assigned Post & Shift
   * Check-in Time & Check-out Time
   * Distance from Post (in meters)
   * Final Attendance Status

---

## ❓ Frequently Asked Questions (FAQ)

**Q1: What happens if an officer tries to mark attendance away from the post?**  
*Answer*: The app automatically measures the distance using GPS and displays an error message showing how many meters away they are. Attendance cannot be submitted until they move inside the allowed radius.

**Q2: Can guards upload old gallery photos?**  
*Answer*: No. The app enforces live camera capture. Furthermore, the server validates image integrity to reject black, covered-lens, or corrupted photos.

**Q3: Does the system work if we have night-shift workers across 12:00 AM?**  
*Answer*: Yes, completely. The system uses an intelligent logical shift date algorithm to keep overnight guards active until their morning checkout without date confusion.

**Q4: How do I handle new site locations or new clients?**  
*Answer*: Simply create a new "Post" in the Web Dashboard, specify its GPS location on the map, and assign guards and officers to it.
