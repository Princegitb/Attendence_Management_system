# 🛡️ Complete Client User Guide & Storybook: The Smart Guard Attendance Management System

Welcome to the **Complete Client User Guide** for the **Smart Guard Attendance Management System**. 

Whether you are a security agency owner, an operations manager at headquarters, or a field supervisor on the ground, this guide breaks down everything about the system—what it does, why it exists, and how to use it step-by-step—told through a clear, non-technical story.

---

## 📖 Table of Contents
1. [The Story: A Day in the Life of Guard Services](#-the-story-a-day-in-the-life-of-guard-services)
2. [What Can This System Do? (Core Features at a Glance)](#-what-can-this-system-do-core-features-at-a-glance)
3. [System Interfaces & Who Uses What](#-system-interfaces--who-uses-what)
4. [Step-by-Step Guide for Managers (The Web Dashboard)](#-step-by-step-guide-for-managers-the-web-dashboard)
   - [Step 1: Setting Up Work Shifts](#step-1-setting-up-work-shifts)
   - [Step 2: Defining Posts & Geo-Fences on the Map](#step-2-defining-posts--geo-fences-on-the-map)
   - [Step 3: Registering Guards & Bulk Excel Import](#step-3-registering-guards--bulk-excel-import)
   - [Step 4: Adding Field Officers](#step-4-adding-field-officers)
   - [Step 5: Monitoring Live Attendance & Managing Exceptions](#step-5-monitoring-live-attendance--managing-exceptions)
   - [Step 6: Generating Payroll-Ready Reports](#step-6-generating-payroll-ready-reports)
5. [Step-by-Step Guide for Field Officers (The Mobile App)](#-step-by-step-guide-for-field-officers-the-mobile-app)
   - [1. Logging In & First-Time Password Enforcement](#1-logging-in--first-time-password-enforcement)
   - [2. The Daily Guard Checklist](#2-the-daily-guard-checklist)
   - [3. Verification via Live GPS & Rear Camera](#3-verification-via-live-gps--rear-camera)
   - [4. Handling Overnight Shifts (Night Shifts)](#4-handling-overnight-shifts-night-shifts)
6. [Frequently Asked Questions (FAQ)](#-frequently-asked-questions-faq)

---

## 🎭 The Story: A Day in the Life of Guard Services

Imagine running a security agency responsible for safeguarding dozens of commercial buildings, warehouses, and gated communities. 

### The Traditional Dilemma
In the past, ensuring that security guards were physically at their assigned posts was a constant headache. Guards often used basic button phones (keypad phones) without internet or smartphones. Supervising them relied on paper logbooks, phone calls, or proxy attendance ("buddy punching"), where a colleague signed in for an absent friend. Managers sat in the central office wondering:
* *Is Guard Rajesh actually at Gate 4 right now?*
* *Did Field Officer Suresh actually visit the warehouse, or did he verify attendance from a coffee shop?*
* *Why does it take three days at the end of every month to process payroll spreadsheets?*

### The Modern Solution
Our **Smart Guard Attendance System** solves this seamlessly by splitting the work into two simple tools:

1. **Guards stay simple**: Guards do **NOT** need smartphones, apps, or data packs. They keep carrying their basic keypad phones.
2. **Field Officers carry smartphones**: Field Officers (site supervisors) travel between posts with an easy-to-use mobile application.
3. **Smart Verification**: When the Field Officer visits a post, the mobile app acquires live satellite GPS coordinates and takes a live photo of the guard on duty. 
4. **Instant Headquarters Sync**: The central office manager watches a live digital dashboard update in real time. If a check-in happens outside the post's approved boundary (geo-fence), the server instantly flags it. If a shift crosses midnight (overnight shift), the system intelligently tracks it without losing data.

At the end of the month, payroll reports are generated in a single click!

---

## 🌟 What Can This System Do? (Core Features at a Glance)

* **Zero-Guard App Requirement**: Works effortlessly even if 100% of your guard workforce uses basic feature phones.
* **Strict Satellite Geo-Fencing**: Ensures attendance can only be marked when the supervisor and guard are physically inside the designated post area (e.g., within 100 meters).
* **Live Camera Verification**: Eliminates photo uploads from phone galleries or fake proxy check-ins by enforcing real-time camera snapshots.
* **Seamless Overnight Shift Support**: Effortlessly manages shifts that start today and end tomorrow (e.g., 8:00 PM to 4:00 AM) without date confusion or lost check-out records.
* **Bulk Excel Roster Upload**: Add 100+ guards to the system in seconds using a pre-formatted Excel template.
* **Real-Time Manager Dashboard**: View live counts of on-duty guards, missing guards, and late check-ins at a glance.
* **Audit-Proof Log Corrections**: Allows managers to correct erroneous records with mandatory justification notes for transparency.
* **1-Click Exportable Payroll Reports**: Export clean CSV/Excel reports filtered by dates, locations, or shifts.

---

## 👥 System Interfaces & Who Uses What

| User Role | Interface Used | Primary Responsibilities |
| :--- | :--- | :--- |
| **Operations Manager / Admin** | **Web Management Dashboard** (Desktop / Laptop Browser) | • Configures Shifts, Posts, and Geo-fences<br>• Uploads and manages guard rosters<br>• Creates supervisor logins<br>• Monitors live status and reviews late alerts<br>• Downloads monthly payroll reports |
| **Field Officer / Site Supervisor** | **Mobile App** (Android / iOS Smartphone) | • Visits physical guard posts<br>• Views assigned daily guard checklists<br>• Takes live guard photo snapshots<br>• Submits GPS-verified check-ins and check-outs |
| **Security Guard** | *No Interface Required* (Carries Keypad Phone) | • Reports to post on time<br>• Stands for live photo verification when supervisor arrives |

---

## 💻 Step-by-Step Guide for Managers (The Web Dashboard)

As an Operations Manager, your web dashboard is your command center. Access it from any modern web browser (Chrome, Edge, Firefox, Safari).

```
[1. Create Shifts] ➔ [2. Create Posts & Maps] ➔ [3. Register Guards] ➔ [4. Add Field Officers] ➔ [5. Monitor & Review]
```

### Step 1: Setting Up Work Shifts
Before assigning guards, define your organization's work schedules.
1. Click on **Shifts** in the side navigation menu.
2. Click **Add New Shift**.
3. Fill in the details:
   - **Shift Name**: (e.g., `Day Shift`, `Evening Shift`, or `Overnight Guarding`).
   - **Start & End Time**: Set the operational hours (e.g., `08:00 AM to 04:00 PM` or `08:00 PM to 04:00 AM`).
   - **Grace Period**: Enter allowed late minutes (e.g., `15` minutes). Check-ins after this time will automatically be flagged for your review.
4. Click **Save**.

### Step 2: Defining Posts & Geo-Fences on the Map
Posts represent physical duty sites (factories, gates, office buildings).
1. Click on **Posts** in the side menu.
2. Click **Add New Post**.
3. Enter the **Post Name** and physical **Address** (e.g., `Tech Park - Main Gate`).
4. **Set Geo-Fence Coordinates**:
   - Use the built-in interactive map search bar to locate your building.
   - Click directly on the map to set the center pin, or click **Use Current Location** if you are setting it up on-site.
5. **Set Radius**: Specify the allowed radius in meters (e.g., `100 meters`). Check-ins outside this invisible circle will be blocked by the server!

### Step 3: Registering Guards & Bulk Excel Import
You can add guards one-by-one or import your entire roster at once.

* **Method A: Bulk Excel Import (Recommended for Large Teams)**
  1. Go to **Guards** and click **Download Excel Template**.
  2. Open the file in Microsoft Excel or Google Sheets and fill in Guard Name, Mobile Number, Assigned Post, and Assigned Shift.
  3. Save the file and click **Upload Excel Roster**. The system automatically validates the data and imports all guards instantly!
* **Method B: Single Guard Registration**
  1. Click **Add Guard**.
  2. Enter the guard's name, phone number, select their assigned Post and Shift, and click **Save**.

### Step 4: Adding Field Officers
Field Officers need app accounts to inspect posts.
1. Go to **Field Officers** in the dashboard.
2. Click **Add Field Officer**.
3. Enter their Name, Mobile Number, and assign an initial password.
4. Assign the officer to specific **Posts** or **Guards**. Once linked, the officer will see those guards when opening their mobile app.

### Step 5: Monitoring Live Attendance & Managing Exceptions
1. Open the **Overview / Live Monitor** view.
2. View real-time counters:
   - **Total Guards**
   - **Currently Checked-In**
   - **Pending / Absent**
   - **Geo-Fence Violations / Late Arrivals**
3. If an emergency occurs (e.g., a guard checked in late due to verified transit failure), click **Correct Status** next to their record, select `APPROVED`, enter a mandatory audit reason (e.g., `Approved by Operations Manager due to bus delay`), and save.

### Step 6: Generating Payroll-Ready Reports
1. Go to **Reports** in the side menu.
2. Select your desired **Start Date** and **End Date** (e.g., 1st to 30th of the month).
3. Click **Export CSV Report**.
4. Open the downloaded spreadsheet to see complete details: guard names, posts, exact check-in/check-out timestamps, GPS distance from post, and final approved attendance status.

---

## 📱 Step-by-Step Guide for Field Officers (The Mobile App)

As a Field Officer on duty, your mobile app makes verifying guards fast and foolproof.

### 1. Logging In & First-Time Password Enforcement
1. Open the **Guard Attendance App** on your smartphone.
2. Enter your registered Mobile Number and Password.
3. **First-Time Security**: If this is your first time logging in, the app will require you to create a new secure password before proceeding.

### 2. The Daily Guard Checklist
Once logged in, the app displays your personalized daily roster split into simple tabs:
* **Pending Tab**: Guards scheduled for duty who haven't checked in yet.
* **Checked-In Tab**: Guards currently active on duty.
* **Checked-Out Tab**: Guards who have completed their shift.

You can use the **Search Bar** or **Filter by Post** dropdown at the top to quickly find any guard.

### 3. Verification via Live GPS & Rear Camera
When you physically arrive at a guard's post:
1. Tap the guard's name under the **Pending** tab.
2. Tap **Mark Check-In**.
3. **Automatic GPS Distance Check**: The app acquires your satellite location. If you are inside the post's allowed radius (e.g., 100 meters), it proceeds. If you are too far away, an alert will show: *"You are 350 meters away from Main Gate. Please move closer."*
4. **Live Rear-Camera Snapshot**: The camera will open. Take a clear, live snapshot of the guard on duty. *(Note: Gallery uploads are blocked to prevent cheating).*
5. Tap **Submit**. The guard is instantly moved to the **Checked-In** tab!

When the shift ends, open the **Checked-In** tab, tap the guard's name, take a quick check-out photo snapshot, and tap **Mark Check-Out**.

### 4. Handling Overnight Shifts (Night Shifts)
Many security details operate overnight (e.g., 8:00 PM to 4:00 AM). 
* **Before Midnight (8:00 PM)**: Check in the guard normally.
* **After Midnight (2:00 AM - 4:00 AM)**: The app intelligently recognizes that the guard is in the middle of an overnight shift. The guard **stays active in your Checked-In tab** across midnight!
* Simply tap **Mark Check-Out** when their night shift completes in the morning.

---

## ❓ Frequently Asked Questions (FAQ)

#### Q1: What happens if guards do not have smartphones?
**Answer:** Guards do not need smartphones or internet access at all! They carry their normal basic keypad phones. The mobile app is only installed on the Field Officer's phone, who visits the guard on-site to verify attendance.

#### Q2: Can a Field Officer mark attendance from home or a coffee shop?
**Answer:** No. The system strictly enforces server-side GPS geo-fencing (using the Haversine formula). If the Field Officer is outside the configured radius (e.g., 100 meters) of the guard's post, the backend server will automatically reject the check-in attempt.

#### Q3: Can Field Officers select a pre-saved photo from their phone gallery?
**Answer:** No. The mobile app strictly enforces live camera activation at the moment of check-in/check-out. Gallery uploads are disabled.

#### Q4: How does the system handle night shifts that cross midnight?
**Answer:** The system features an intelligent logical date calculation engine. If a shift runs from 8:00 PM to 4:00 AM, the check-out at 4:00 AM is automatically linked to the 8:00 PM check-in of the preceding evening, ensuring continuous tracking without date errors.

#### Q5: Can managers correct attendance records if an honest mistake occurs?
**Answer:** Yes. Managers can perform manual corrections through the Web Dashboard. However, to prevent abuse, the system requires a mandatory audit note explaining why the correction was made, creating a transparent audit log.

---

*System designed and built for enterprise workforce management.*
