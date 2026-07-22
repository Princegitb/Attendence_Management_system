# Guard Attendance Management System

A production-grade, end-to-end workforce management and attendance verification system designed specifically for security guard agencies.

> **Key Architectural Design**: Security guards carry basic keypad phones and do **NOT** use any mobile application themselves. Instead, mobile **Field Officers** physically visit each security post, verify guard presence via live GPS geo-fencing (server-side Haversine formula), and capture live rear-camera photo proofs using the Field Officer Android/iOS App.

---

## Key System Features

### 📱 1. Field Officer Mobile App (Flutter)

- **Zero-Guard App Dependency**: Designed for guards with basic keypad phones.
- **Live GPS Geo-Fencing**: Acquires live device GPS coordinates with accuracy metrics.
- **Rear-Camera Photo Proofs**: Enforces live camera capture to prevent gallery uploads or proxy attendance.
- **Daily Guard Checklist**: Displays assigned guards categorized by *Pending*, *Checked-In*, and *Checked-Out* status.
- **First-Login Security Enforcement**: Mandatory password change policy on first login.

### 💻 2. Manager Web Dashboard (React + Vite + TailwindCSS)

- **Live Real-Time Overview**: Live counters for total guards, present count, absent/pending count, and geo-fence violation alerts.
- **Interactive Geo-Fence Location Picker**: Fast geocoding search bar + 1-click GPS detector to set post coordinates and radius.
- **Bulk Guard Roster Import (Excel)**: Upload 100+ guards in seconds using Excel (`.xlsx`) templates with full automated validation.
- **Audit Logs & Auditability**: Immutable log tracking of all manager edits, manual attendance corrections, and officer creations.
- **Manual Attendance Correction Engine**: Allows managers to correct attendance with mandatory detailed audit reasons.
- **1-Click CSV Attendance Reports**: Download formatted attendance reports filterable by date range.

### ⚡ 3. Backend API & Security (Node.js + Express + PostgreSQL)

- **Zero-Trust Server Verification**: Independent server-side distance calculation using the **Haversine formula** to enforce post radiuses.
- **PostgreSQL Database**: Relational schema supporting Guards, Field Officers, Posts, Shifts, Assignments, Attendance, and Audit Logs.
- **Short-Lived JWT & Refresh Tokens**: Secure token rotation with bcrypt password hashing.
- **Rate-Limiting & Protection**: Built-in protection against brute-force attacks.

---

## Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Mobile App** | Flutter 3.x, Dart, Geolocator, Camera Plugin, Flutter Secure Storage |
| **Web Dashboard** | React 18, Vite, TailwindCSS, Lucide Icons, XLSX |
| **Backend API** | Node.js, Express.js, JWT, bcryptjs, Multer |
| **Database** | PostgreSQL (Supabase) |
| **Geo-Fencing Engine** | Server-Side Haversine Distance Calculation |
| **Deployment** | Vercel (Web Dashboard), Render (Backend API), GitHub |

---

## Repository Structure

```text
Attendence_Management_system/
├── backend/                  # Node.js + Express API & PostgreSQL Models
│   ├── src/
│   │   ├── controllers/      # Attendance, Officer, Guard, Post, Audit Controllers
│   │   ├── db/               # PostgreSQL Pool, Schemas, Seeders, and Mock Fallback
│   │   ├── middleware/       # JWT Auth & Rate Limiter Middlewares
│   │   ├── routes/           # Express Routers
│   │   └── utils/            # Haversine, Excel Parser, JWT, Audit Logger
│   └── server.js             # API Server Entrypoint (Port 5000)
├── web-dashboard/            # React + Vite Manager Web Portal
│   ├── src/
│   │   ├── components/       # LocationPickerMap, Modals, Navbar, Sidebar
│   │   ├── services/         # API Service Client
│   │   └── views/            # Overview, Attendance, Guards, Officers, Posts, Shifts
│   └── vercel.json           # Vercel Proxy Rewrite Configuration
└── mobile-app/               # Flutter Field Officer Mobile Application
    └── lib/
        ├── models/           # Guard & User Models
        ├── screens/          # Login, Change Password, Checklist, Mark Attendance
        └── services/         # API Service & Location Service
```

---

## 🚀 Quick Start & Local Setup Guide

### Prerequisites

- **Node.js**: v18+
- **Flutter SDK**: v3.16+
- **PostgreSQL** or **Node Dev Mock DB** (Runs automatically if PostgreSQL is offline)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/Princegitb/Attendence_Management_system.git
cd Attendence_Management_system
```

---

### Step 2: Start Backend Server

```bash
cd backend
npm install
npm start
```

> The API server will run at `http://localhost:5000`.

---

### Step 3: Start Manager Web Dashboard

```bash
cd ../web-dashboard
npm install
npm run dev
```

> Open `http://localhost:3000` in your browser.

---

### Step 4: Run Field Officer Mobile App

```bash
cd ../mobile-app
flutter pub get
flutter run
```

To build a production Android `.apk` binary:

```bash
flutter build apk --release
```

Output path: `mobile-app/build/app/outputs/flutter-apk/app-release.apk`

---

## 📐 Geo-Fencing Math (Haversine Formula)

The backend calculates the distance between the Field Officer's GPS coordinates $(\text{lat}_1, \text{lon}_1)$ and the Guard's assigned Post $(\text{lat}_2, \text{lon}_2)$ using:

$$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)} \right)$$

Where $R = 6,371,000$ meters. If $d > \text{allowed\_radius\_metres}$, the check-in is rejected by the server.

---

Developed by **Prince Shukla** ([@Princegitb](https://github.com/Princegitb))
