# 🎓 StudentSphere

StudentSphere is a full-stack **student life management dashboard** that brings together academics, lifestyle planning, notes, calendar sync, and optional AI study tools into one polished app.

- **Frontend:** HTML, JavaScript, Tailwind CSS  
- **Backend:** Python (Flask) + Firebase (Auth & Firestore)  
- Structured for a 4-person team with a 9-day implementation roadmap.

> Smart dashboard for students — marks & attendance, habits, timetable, notes, calendar sync, and optional GPT-powered features.

---

## 🚀 Quick repo description

**StudentSphere — Full-stack student life dashboard (Flask, Firebase, Tailwind)**

---

## ✨ Features

- 📊 **Academics:** marks & attendance tracking and summaries  
- 🧭 **Lifestyle:** timetable, habit tracker, progress overview  
- 📝 **Notes:** simple notepad with CRUD operations  
- 📅 **Calendar:** view & optionally sync with Google Calendar  
- 🤖 **AI (optional):** auto-notes and quiz generation via GPT API  
- 🔐 **Auth:** Firebase-backed authentication + JWT session support

---

**Auth**
- `POST /auth/register` — register (email, password)
- `POST /auth/login` — login → returns JWT

**Profile**
- `GET /profile`
- `PUT /profile`

**Marks & Attendance**
- `GET /marks` | `POST /marks` | `PUT /marks/:id` | `DELETE /marks/:id`
- `GET /attendance` | `POST /attendance`

**Notes**
- `GET /notes` | `POST /notes` | `PUT /notes/:id` | `DELETE /notes/:id`

**Habits & Timetable**
- `GET /habits` | `POST /habits` | `PUT /habits/:id`
- `GET /timetable` | `POST /timetable`

---
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.x-blue.svg)]()
[![Framework: Flask](https://img.shields.io/badge/Framework-Flask-lightgrey.svg)]()
[![Firebase](https://img.shields.io/badge/Database-Firebase-orange.svg)]()

---
