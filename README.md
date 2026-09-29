# 🏥 Healthcare Portal Monorepo

A modern, full-stack healthcare management system featuring multi-role administration, clinical workflows, patient tracking, appointment scheduling, billing, and AI-assisted consultation transcription.

## 🌟 Overview

The **Healthcare Portal** is structured as a monorepo containing a RESTful backend API and a responsive Next.js frontend client. It is designed to streamline day-to-day operations for clinics, doctors, and healthcare administrators, while providing smart AI tools to draft consultation notes and prescriptions directly from doctor-patient conversation transcripts.

---

## ✨ Key Features

### 🏢 Clinic & Doctor Management
- **Multi-Role Administration**: Switch between **Super Admin**, **Clinic Admin**, and **Doctor** directly from the UI.
- **Clinic Profiles & Analytics**: Manage specialties, facilities, timings, beds, and view operational statistics.
- **Doctor Onboarding & Scheduling**: Configure doctor specializations, availability, consultation fees, and recurring slots.

### 📅 Appointments & Queues
- **Interactive Calendar & Booking**: Book appointments, schedule slots, view daily/weekly doctor calendars.
- **Waiting Queue Management**: Real-time queue tracking for walk-in and scheduled patients.
- **Status Workflows**: Update appointment lifecycle (scheduled, completed, cancelled, follow-up needed).

### 🩺 Consultations & AI Assistance
- **Clinical Records**: Capture chief complaints, diagnosis, vitals, consultation notes, and prescription line items.
- **AI Consultation Transcriber**: Integrates with Claude (Anthropic API) to parse audio/text consultation transcripts (supporting English, Hindi, and Hinglish) into structured clinical notes and prescriptions.
- **Visit History & Timeline**: Track longitudinal patient records and past prescriptions.

### 💳 Invoicing & Billing
- **Invoice Generation**: Automated invoice creation from appointments with tax and discount support.
- **Payment Tracking**: Record cash, card, and UPI transactions.
- **Insurance Claims**: Track policy numbers and insurance coverage calculations.

---

## 🏗️ Monorepo Architecture

```text
Healthcare-/
├── healthcare-backend/            # Express.js REST API & Services
│   ├── config/                    # Database, Socket.IO, Swagger, and Env configs
│   ├── controllers/               # Business logic controllers
│   ├── middleware/                # MVP role & context parsers, error handlers
│   ├── models/                    # Mongoose schemas (Clinic, Doctor, Patient, etc.)
│   ├── routes/                    # API route definitions
│   ├── scripts/                   # Database seeding utilities (seedDemo.js)
│   ├── services/                  # Email, AI (Claude), Cron, and Reminder queues
│   ├── utils/                     # Error classes and helper services
│   ├── .env.example               # Backend environment variables template
│   └── package.json
│
├── healthcare-frontend-mvp/       # Next.js 16 (App Router) Frontend
│   ├── src/
│   │   ├── app/                   # App Router pages ((dashboard), confirm, register)
│   │   ├── components/            # UI components (Sidebar, Forms, Modals, Cards)
│   │   ├── lib/                   # Axios API client, Zustand state stores, utils
│   │   └── services/              # Frontend API data services
│   ├── .env.local.example         # Frontend environment variables template
│   └── package.json
│
├── .gitignore                     # Monorepo root ignore file
├── package.json                   # Root scripts for running both apps concurrently
└── README.md
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI & State**: [React 19](https://react.dev/), [Zustand](https://zustand-demo.pmnd.rs/) (Persisted State), [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons & UI Utilities**: React Icons (`fi`), React Hot Toast, Dayjs
- **HTTP Client**: Axios (with automatic role and clinic context interceptors)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) (ODM)
- **Real-Time**: [Socket.IO](https://socket.io/)
- **API Documentation**: [Swagger UI Express](https://swagger.io/) (OpenAPI 3.0)
- **Background Tasks**: Node-Cron, Nodemailer (Email), Bull Queue (Redis-ready)

---

## 📋 Prerequisites

Before running the application, ensure you have installed:
- **Node.js**: `v18.0.0` or higher ([Download](https://nodejs.org/))
- **npm**: `v9.0.0` or higher
- **MongoDB**: A running local instance (`mongodb://localhost:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster connection string.

---

## 🚀 Quick Start & Setup

### 1. Install Dependencies

You can install all dependencies for both the root monorepo, backend, and frontend with a single command from the root directory:

```bash
# From the Healthcare- root folder
npm run install:all
```

*(Alternatively, run `npm install` inside both `healthcare-backend` and `healthcare-frontend-mvp`).*

---

### 2. Configure Environment Variables

#### Backend Configuration
Copy the example environment file inside `healthcare-backend`:

```bash
# Windows (PowerShell)
Copy-Item healthcare-backend/.env.example healthcare-backend/.env

# macOS / Linux
cp healthcare-backend/.env.example healthcare-backend/.env
```

Open `healthcare-backend/.env` and adjust the variables if needed:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/healthcare-portal
FRONTEND_URL=http://localhost:3000

# Optional third-party integrations:
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
ANTHROPIC_API_KEY=sk-ant-api03-...
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

#### Frontend Configuration
Create a `.env.local` file inside `healthcare-frontend-mvp`:

```bash
# Windows (PowerShell)
Copy-Item healthcare-frontend-mvp/.env.local.example healthcare-frontend-mvp/.env.local

# macOS / Linux
cp healthcare-frontend-mvp/.env.local.example healthcare-frontend-mvp/.env.local
```

Ensure `healthcare-frontend-mvp/.env.local` contains:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

### 3. Seed the Database

Populate your database with sample clinics (**City Health Clinic**, **Green Valley Medical Center**), doctors, patients, and initial appointments:

```bash
cd healthcare-backend
node scripts/seedDemo.js
cd ..
```

*(This is a one-time operation. Your data remains persistent in MongoDB and will not be overwritten on server restarts).*

---

### 4. Start the Application

You can launch both the backend and frontend simultaneously with a single command from the root folder:

```bash
# Start both backend and frontend concurrently
npm run dev
```

Or run them individually in separate terminal tabs:

```bash
# Run Backend (Port 5000)
npm run dev:backend

# Run Frontend (Port 3000)
npm run dev:frontend
```

Once started:
- 💻 **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **Backend API**: [http://localhost:5000](http://localhost:5000)
- 📖 **Swagger API Documentation**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

---

## ⚙️ Environment Variables Reference

### Backend (`healthcare-backend/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Yes | `5000` | Port on which the Express server listens. |
| `NODE_ENV` | Yes | `development` | Environment mode (`development` or `production`). |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/healthcare-portal` | MongoDB connection string (Local or Atlas URI). |
| `FRONTEND_URL` | Yes | `http://localhost:3000` | Allowed CORS origin for the frontend client. |
| `EMAIL_USER` | Optional | `your-email@gmail.com` | Gmail address for sending patient OTPs and prescriptions. |
| `EMAIL_PASSWORD` | Optional | `your-gmail-app-password` | Google 16-character App Password for SMTP. |
| `ANTHROPIC_API_KEY` | Optional | - | Anthropic API key for AI consultation transcription. |
| `REDIS_HOST` | Optional | `127.0.0.1` | Host for Redis (Bull reminder queue). |
| `REDIS_PORT` | Optional | `6379` | Port for Redis. |

### Frontend (`healthcare-frontend-mvp/.env.local`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:5000/api` | Base URL for the backend API endpoints. |

---

