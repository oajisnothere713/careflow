# 📚 Healthcare Portal - Swagger API Documentation

## Access Swagger UI

After starting the server, visit:
```
http://localhost:5000/api-docs
```

---

## 🔐 Authentication Endpoints

### 1. Send OTP
```
POST /api/auth/send-otp
```

**Purpose**: Generate and send OTP to email/phone

**Request Body**:
```json
{
  "email": "user@example.com",
  "phone": "9876543210",
  "type": "signup" // or "login"
}
```

**Response** (200):
```json
{
  "message": "OTP sent successfully to your email",
  "success": true
}
```

**Error** (400):
```json
{
  "message": "User already exists with this email or phone"
}
```

---

### 2. Verify OTP & Sign Up
```
POST /api/auth/verify-otp-signup
```

**Purpose**: Verify OTP and create new user account

**Request Body**:
```json
{
  "email": "user@example.com",
  "phone": "9876543210",
  "otp": "123456",
  "name": "John Doe",
  "role": "patient" // admin, doctor, staff, patient
}
```

**Response** (201):
```json
{
  "message": "Account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "9876543210",
    "role": "patient",
    "isVerified": true
  }
}
```

---

### 3. Verify OTP & Login
```
POST /api/auth/verify-otp-login
```

**Purpose**: Verify OTP and login to existing account

**Request Body**:
```json
{
  "email": "user@example.com",
  "phone": "9876543210",
  "otp": "123456"
}
```

**Response** (200):
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "patient"
  }
}
```

---

## 🏥 Clinic Management Endpoints

### 4. Create Clinic
```
POST /api/clinics
```

**Auth**: Required (Admin only)  
**Header**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Apollo Hospital",
  "registration_number": "REG123456",
  "address": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400001",
    "country": "India"
  },
  "contact": {
    "phone": "9876543210",
    "email": "apollo@hospital.com",
    "website": "https://apollo.com"
  },
  "timings": {
    "Monday": { "open": "09:00", "close": "18:00", "isClosed": false },
    "Tuesday": { "open": "09:00", "close": "18:00", "isClosed": false },
    "Sunday": { "isClosed": true }
  },
  "specialties": ["Cardiology", "Orthopedics", "Pediatrics"],
  "facilities": ["ICU", "OT", "Lab", "Pharmacy"],
  "total_beds": 200,
  "status": "active"
}
```

**Response** (201):
```json
{
  "message": "Clinic created successfully",
  "clinic": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Apollo Hospital",
    "registration_number": "REG123456",
    "status": "active",
    "createdAt": "2026-01-03T10:00:00Z"
  }
}
```

---

### 5. Get All Clinics
```
GET /api/clinics?page=1&limit=10&status=active&city=Mumbai&specialty=Cardiology
```

**Auth**: Required  
**Query Params**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string: active, inactive, temporarily_closed)
- `city` (string)
- `specialty` (string)

**Response** (200):
```json
{
  "message": "Clinics retrieved successfully",
  "clinics": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Apollo Hospital",
      "address": { "city": "Mumbai" },
      "status": "active",
      "totalDoctors": 15,
      "totalPatients": 342
    }
  ],
  "total": 42,
  "pages": 5
}
```

---

### 6. Get Clinic Details
```
GET /api/clinics/:id
```

**Auth**: Required  
**Params**: 
- `id` (MongoDB ObjectId)

**Response** (200):
```json
{
  "message": "Clinic retrieved successfully",
  "clinic": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Apollo Hospital",
    "registration_number": "REG123456",
    "address": { "city": "Mumbai", "street": "123 Main Street" },
    "contact": { "phone": "9876543210", "email": "apollo@hospital.com" },
    "specialties": ["Cardiology", "Orthopedics"],
    "facilities": ["ICU", "OT", "Lab"],
    "total_beds": 200,
    "status": "active"
  }
}
```

---

### 7. Update Clinic
```
PUT /api/clinics/:id
```

**Auth**: Required (Admin only)

**Request Body**: Any clinic fields to update

**Response** (200):
```json
{
  "message": "Clinic updated successfully",
  "clinic": { /* updated clinic object */ }
}
```

---

### 8. Delete Clinic
```
DELETE /api/clinics/:id
```

**Auth**: Required (Admin only)

**Response** (200):
```json
{
  "message": "Clinic deleted successfully"
}
```

---

### 9. Get Clinic Statistics
```
GET /api/clinics/:id/stats
```

**Auth**: Required

**Response** (200):
```json
{
  "message": "Stats retrieved successfully",
  "stats": {
    "totalDoctors": 15,
    "totalPatients": 342,
    "totalAppointments": 1250,
    "completedAppointments": 1100,
    "pendingAppointments": 75,
    "cancelledAppointments": 75,
    "totalRevenue": 450000,
    "averageRating": 4.5
  }
}
```

---

## 👥 Patient Management Endpoints

### 10. Admit Patient (Registration)
```
POST /api/patients
```

**Auth**: Required (Admin, Doctor, Staff)

**Request Body**:
```json
{
  "user_id": "507f1f77bcf86cd799439011",
  "clinic_id": "507f1f77bcf86cd799439012",
  "gender": "Male",
  "date_of_birth": "1990-05-15",
  "blood_group": "O+",
  "phone": "9876543210",
  "emergency_contact": {
    "name": "Jane Doe",
    "phone": "9876543211",
    "relationship": "Spouse"
  }
}
```

**Response** (201):
```json
{
  "message": "Patient admitted successfully",
  "patient": {
    "_id": "507f1f77bcf86cd799439013",
    "user_id": "507f1f77bcf86cd799439011",
    "clinic_id": "507f1f77bcf86cd799439012",
    "patient_id": "P2026-00001",
    "gender": "Male",
    "blood_group": "O+",
    "status": "active"
  }
}
```

---

### 11. Get All Patients
```
GET /api/patients?page=1&limit=10&clinic_id=507f1f77bcf86cd799439012&status=active
```

**Auth**: Required

**Query Params**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `clinic_id` (string)
- `status` (string: active, inactive, discharged)

**Response** (200):
```json
{
  "message": "Patients retrieved successfully",
  "patients": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "patient_id": "P2026-00001",
      "user_id": { "name": "John Doe", "email": "john@example.com" },
      "blood_group": "O+",
      "status": "active"
    }
  ],
  "total": 342,
  "pages": 35
}
```

---

### 12. Get Patient Details
```
GET /api/patients/:id
```

**Auth**: Required

**Response** (200):
```json
{
  "message": "Patient retrieved successfully",
  "patient": {
    "_id": "507f1f77bcf86cd799439013",
    "patient_id": "P2026-00001",
    "user_id": { "name": "John Doe", "email": "john@example.com" },
    "clinic_id": { "name": "Apollo Hospital" },
    "gender": "Male",
    "date_of_birth": "1990-05-15",
    "blood_group": "O+",
    "insurance_id": "507f1f77bcf86cd799439014",
    "status": "active"
  }
}
```

---

### 13. Get Medical History
```
GET /api/patients/:id/medical-history
```

**Auth**: Required

**Response** (200):
```json
{
  "message": "Medical history retrieved successfully",
  "medical_history": {
    "_id": "507f1f77bcf86cd799439015",
    "patient_id": "507f1f77bcf86cd799439013",
    "known_conditions": [
      {
        "condition": "Hypertension",
        "diagnosed_year": 2015,
        "status": "managed",
        "notes": "Controlled with medication"
      }
    ],
    "allergies": [
      {
        "allergen": "Penicillin",
        "reaction": "Rash",
        "severity": "moderate"
      }
    ],
    "current_medications": [
      {
        "medicine_name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
        "start_date": "2015-01-01"
      }
    ],
    "past_surgeries": [
      {
        "surgery": "Appendectomy",
        "date": "2010-06-15",
        "notes": "Successful"
      }
    ],
    "family_history": [
      {
        "relation": "Father",
        "condition": "Hypertension",
        "age_of_onset": 45
      }
    ],
    "immunizations": [
      {
        "vaccine": "COVID-19",
        "dose": 2,
        "date": "2021-06-15"
      }
    ],
    "lifestyle": {
      "smoking": "Never",
      "alcohol": "Occasionally",
      "exercise": "Moderate - 3 times/week",
      "diet": "Vegetarian"
    }
  }
}
```

---

### 14. Update Medical History
```
PUT /api/patients/:id/medical-history
```

**Auth**: Required (Doctor, Staff)

**Request Body**:
```json
{
  "known_conditions": [
    {
      "condition": "Diabetes",
      "diagnosed_year": 2018,
      "status": "managed"
    }
  ],
  "allergies": [
    {
      "allergen": "Aspirin",
      "reaction": "Stomach upset",
      "severity": "mild"
    }
  ]
}
```

**Response** (200):
```json
{
  "message": "Medical history updated successfully",
  "medical_history": { /* updated object */ }
}
```

---

### 15. Add Allergies
```
POST /api/patients/:id/allergies
```

**Auth**: Required (Doctor, Staff)

**Request Body**:
```json
{
  "allergen": "Peanuts",
  "reaction": "Anaphylaxis",
  "severity": "severe"
}
```

**Response** (200):
```json
{
  "message": "Allergy added successfully"
}
```

---

### 16. Add Medications
```
POST /api/patients/:id/medications
```

**Auth**: Required (Doctor, Staff)

**Request Body**:
```json
{
  "medicine_name": "Metformin",
  "dosage": "500mg",
  "frequency": "Twice daily",
  "start_date": "2026-01-03"
}
```

**Response** (200):
```json
{
  "message": "Medication added successfully"
}
```

---

### 17. Update Patient
```
PUT /api/patients/:id
```

**Auth**: Required (Patient can update own, Doctor/Staff can update clinic patients)

**Request Body**: Any patient fields

**Response** (200):
```json
{
  "message": "Patient updated successfully",
  "patient": { /* updated object */ }
}
```

---

## 📅 Appointment Endpoints

### 18. Book Appointment
```
POST /api/appointments
```

**Auth**: Required (Patient, Staff)

**Request Body**:
```json
{
  "patient_id": "507f1f77bcf86cd799439013",
  "doctor_id": "507f1f77bcf86cd799439016",
  "clinic_id": "507f1f77bcf86cd799439012",
  "appointment_date": "2026-01-15",
  "appointment_time": "14:00",
  "reason": "Regular checkup",
  "booking_source": "online"
}
```

**Response** (201):
```json
{
  "message": "Appointment booked successfully",
  "appointment": {
    "_id": "507f1f77bcf86cd799439017",
    "appointment_number": "APT20260103001",
    "patient_id": "507f1f77bcf86cd799439013",
    "doctor_id": "507f1f77bcf86cd799439016",
    "appointment_date": "2026-01-15",
    "appointment_time": "14:00",
    "status": "booked",
    "reason": "Regular checkup"
  }
}
```

**Error** (400):
```json
{
  "message": "Selected slot is already booked"
}
```

---

### 19. Get All Appointments
```
GET /api/appointments?page=1&limit=10&status=booked&patient_id=507f1f77bcf86cd799439013
```

**Auth**: Required

**Query Params**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string: booked, confirmed, completed, cancelled, no-show)
- `patient_id` (string)
- `doctor_id` (string)
- `date` (string: YYYY-MM-DD)

**Response** (200):
```json
{
  "message": "Appointments retrieved successfully",
  "appointments": [
    {
      "_id": "507f1f77bcf86cd799439017",
      "appointment_number": "APT20260103001",
      "patient_id": { "name": "John Doe", "patient_id": "P2026-00001" },
      "doctor_id": { "name": "Dr. Smith" },
      "appointment_date": "2026-01-15",
      "appointment_time": "14:00",
      "status": "booked"
    }
  ],
  "total": 150,
  "pages": 15
}
```

---

### 20. Get Appointment Details
```
GET /api/appointments/:id
```

**Auth**: Required

**Response** (200):
```json
{
  "message": "Appointment retrieved successfully",
  "appointment": {
    "_id": "507f1f77bcf86cd799439017",
    "appointment_number": "APT20260103001",
    "patient_id": { "name": "John Doe", "patient_id": "P2026-00001", "phone": "9876543210" },
    "doctor_id": { "name": "Dr. Smith", "specialization": "General Practice" },
    "clinic_id": { "name": "Apollo Hospital" },
    "appointment_date": "2026-01-15",
    "appointment_time": "14:00",
    "reason": "Regular checkup",
    "status": "booked",
    "booking_source": "online"
  }
}
```

---

### 21. Get Available Doctor Slots
```
GET /api/appointments/doctor/:doctorId/available-slots?date=2026-01-15
```

**Auth**: Required

**Query Params**:
- `date` (string, required: YYYY-MM-DD)

**Response** (200):
```json
{
  "message": "Available slots retrieved successfully",
  "date": "2026-01-15",
  "day": "Wednesday",
  "available_slots": [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30"
  ],
  "booked_slots": ["11:00", "11:30", "16:00"]
}
```

---

### 22. Reschedule Appointment
```
PUT /api/appointments/:id/reschedule
```

**Auth**: Required (Patient, Doctor, Staff)

**Request Body**:
```json
{
  "new_date": "2026-01-20",
  "new_time": "15:00",
  "reason": "Cannot attend scheduled time"
}
```

**Response** (200):
```json
{
  "message": "Appointment rescheduled successfully",
  "appointment": {
    "_id": "507f1f77bcf86cd799439017",
    "appointment_date": "2026-01-20",
    "appointment_time": "15:00",
    "status": "booked",
    "rescheduled_from": "507f1f77bcf86cd799439018"
  }
}
```

---

### 23. Cancel Appointment
```
PUT /api/appointments/:id/cancel
```

**Auth**: Required (Patient, Doctor, Staff)

**Request Body**:
```json
{
  "reason": "Patient requested cancellation"
}
```

**Response** (200):
```json
{
  "message": "Appointment cancelled successfully",
  "appointment": {
    "_id": "507f1f77bcf86cd799439017",
    "status": "cancelled",
    "cancelled_at": "2026-01-03T10:00:00Z"
  }
}
```

---

### 24. Update Appointment Status
```
PUT /api/appointments/:id/status
```

**Auth**: Required (Doctor, Staff)

**Request Body**:
```json
{
  "status": "completed"
}
```

**Response** (200):
```json
{
  "message": "Appointment status updated successfully",
  "appointment": {
    "_id": "507f1f77bcf86cd799439017",
    "status": "completed"
  }
}
```

---

## 🩺 Consultation Endpoints

### 25. Create Consultation Note
```
POST /api/consultations
```

**Auth**: Required (Doctor)

**Request Body**:
```json
{
  "appointment_id": "507f1f77bcf86cd799439017",
  "chief_complaint": "Chest pain",
  "symptoms": [
    {
      "symptom": "Chest pain",
      "duration": "2 days",
      "severity": 7
    },
    {
      "symptom": "Shortness of breath",
      "duration": "2 days",
      "severity": 5
    }
  ],
  "vital_signs": {
    "blood_pressure": "140/90",
    "heart_rate": 85,
    "temperature": 37.2,
    "oxygen_saturation": 98,
    "weight": 75,
    "height": 175
  },
  "diagnosis": "Acute coronary syndrome - Pending ECG",
  "treatment_plan": "Hospitalize, Run ECG, Cardiology consult",
  "follow_up_instructions": "Follow up in 24 hours after ECG results"
}
```

**Response** (201):
```json
{
  "message": "Consultation note created successfully",
  "consultation": {
    "_id": "507f1f77bcf86cd799439019",
    "appointment_id": "507f1f77bcf86cd799439017",
    "doctor_id": "507f1f77bcf86cd799439016",
    "chief_complaint": "Chest pain",
    "diagnosis": "Acute coronary syndrome - Pending ECG",
    "status": "draft"
  }
}
```

---

### 26. Get Patient Consultations
```
GET /api/consultations/patient/:patientId?page=1&limit=10
```

**Auth**: Required

**Response** (200):
```json
{
  "message": "Consultations retrieved successfully",
  "consultations": [
    {
      "_id": "507f1f77bcf86cd799439019",
      "appointment_id": { "appointment_number": "APT20260103001" },
      "doctor_id": { "name": "Dr. Smith" },
      "chief_complaint": "Chest pain",
      "diagnosis": "Acute coronary syndrome - Pending ECG",
      "createdAt": "2026-01-03T10:00:00Z"
    }
  ],
  "total": 5
}
```

---

### 27. Add Prescription
```
POST /api/consultations/:id/prescriptions
```

**Auth**: Required (Doctor)

**Request Body**:
```json
{
  "medications": [
    {
      "medicine_name": "Aspirin",
      "dosage": "100mg",
      "frequency": "Once daily",
      "duration": "7 days",
      "instructions": "Take with food",
      "quantity": 7
    },
    {
      "medicine_name": "Atorvastatin",
      "dosage": "20mg",
      "frequency": "Once daily at night",
      "duration": "30 days",
      "instructions": "Take at night",
      "quantity": 30
    }
  ]
}
```

**Response** (201):
```json
{
  "message": "Prescription created successfully",
  "prescription": {
    "_id": "507f1f77bcf86cd799439020",
    "consultation_id": "507f1f77bcf86cd799439019",
    "appointment_id": "507f1f77bcf86cd799439017",
    "patient_id": "507f1f77bcf86cd799439013",
    "doctor_id": "507f1f77bcf86cd799439016",
    "medications": [ /* medications array */ ],
    "status": "active",
    "valid_until": "2026-02-02"
  }
}
```

---

### 28. Get Patient Prescriptions
```
GET /api/consultations/prescriptions/patient/:patientId?page=1&limit=10
```

**Auth**: Required

**Response** (200):
```json
{
  "message": "Prescriptions retrieved successfully",
  "prescriptions": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "consultation_id": "507f1f77bcf86cd799439019",
      "doctor_id": { "name": "Dr. Smith" },
      "medications": [ /* medications */ ],
      "status": "active",
      "valid_until": "2026-02-02"
    }
  ],
  "total": 3
}
```

---

### 29. Add Lab Report
```
POST /api/consultations/lab-reports
```

**Auth**: Required (Doctor, Lab Staff)

**Request Body**:
```json
{
  "appointment_id": "507f1f77bcf86cd799439017",
  "patient_id": "507f1f77bcf86cd799439013",
  "test_name": "ECG",
  "test_date": "2026-01-03",
  "test_result": "Normal sinus rhythm",
  "normal_range": "60-100 bpm",
  "findings": "No acute changes observed",
  "interpretation": "Normal",
  "ordered_by": "507f1f77bcf86cd799439016"
}
```

**Response** (201):
```json
{
  "message": "Lab report created successfully",
  "lab_report": {
    "_id": "507f1f77bcf86cd799439021",
    "test_name": "ECG",
    "test_result": "Normal sinus rhythm",
    "interpretation": "Normal",
    "status": "completed"
  }
}
```

---

### 30. Get Patient Lab Reports
```
GET /api/consultations/lab-reports/patient/:patientId?page=1&limit=10
```

**Auth**: Required

**Response** (200):
```json
{
  "message": "Lab reports retrieved successfully",
  "lab_reports": [
    {
      "_id": "507f1f77bcf86cd799439021",
      "test_name": "ECG",
      "test_date": "2026-01-03",
      "interpretation": "Normal",
      "status": "completed"
    }
  ],
  "total": 8
}
```

---

### 31. Create Visit Record
```
POST /api/consultations/visit-records
```

**Auth**: Required (Doctor, Staff)

**Request Body**:
```json
{
  "appointment_id": "507f1f77bcf86cd799439017",
  "patient_id": "507f1f77bcf86cd799439013",
  "visit_type": "follow-up",
  "duration_minutes": 30,
  "chief_complaint": "Chest pain resolved",
  "summary": "Patient recovering well, continues medication",
  "next_visit": "2026-01-17"
}
```

**Response** (201):
```json
{
  "message": "Visit record created successfully",
  "visit_record": {
    "_id": "507f1f77bcf86cd799439022",
    "appointment_id": "507f1f77bcf86cd799439017",
    "visit_type": "follow-up",
    "summary": "Patient recovering well, continues medication"
  }
}
```

---

### 32. Get Patient Visit Records
```
GET /api/consultations/visit-records/patient/:patientId?page=1&limit=10
```

**Auth**: Required

**Response** (200):
```json
{
  "message": "Visit records retrieved successfully",
  "visit_records": [
    {
      "_id": "507f1f77bcf86cd799439022",
      "appointment_id": { "appointment_number": "APT20260103001" },
      "visit_type": "follow-up",
      "duration_minutes": 30,
      "summary": "Patient recovering well, continues medication"
    }
  ],
  "total": 12
}
```

---

## 💳 Billing Endpoints

### 33. Create Invoice
```
POST /api/billing/invoices
```

**Auth**: Required (Doctor, Staff, Admin)

**Request Body**:
```json
{
  "appointment_id": "507f1f77bcf86cd799439017",
  "patient_id": "507f1f77bcf86cd799439013",
  "clinic_id": "507f1f77bcf86cd799439012",
  "line_items": [
    {
      "description": "Doctor Consultation",
      "type": "service",
      "quantity": 1,
      "unit_price": 500
    },
    {
      "description": "ECG Test",
      "type": "test",
      "quantity": 1,
      "unit_price": 300
    }
  ],
  "insurance_policy_id": "507f1f77bcf86cd799439014",
  "discount_percentage": 0,
  "tax_percentage": 5
}
```

**Response** (201):
```json
{
  "message": "Invoice created successfully",
  "invoice": {
    "_id": "507f1f77bcf86cd799439023",
    "invoice_number": "INV202601-0001",
    "patient_id": "507f1f77bcf86cd799439013",
    "subtotal": 800,
    "tax": 40,
    "discount": 0,
    "total": 840,
    "insurance_covered_amount": 0,
    "patient_payable": 840,
    "status": "pending",
    "due_date": "2026-01-17"
  }
}
```

---

### 34. Get All Invoices
```
GET /api/billing/invoices?page=1&limit=10&status=pending&patient_id=507f1f77bcf86cd799439013
```

**Auth**: Required

**Query Params**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string: pending, partial, paid, overdue, cancelled)
- `patient_id` (string)
- `from_date` (string: YYYY-MM-DD)
- `to_date` (string: YYYY-MM-DD)

**Response** (200):
```json
{
  "message": "Invoices retrieved successfully",
  "invoices": [
    {
      "_id": "507f1f77bcf86cd799439023",
      "invoice_number": "INV202601-0001",
      "patient_id": { "name": "John Doe", "patient_id": "P2026-00001" },
      "total": 840,
      "amount_paid": 0,
      "balance_due": 840,
      "status": "pending"
    }
  ],
  "total": 150
}
```

---

### 35. Get Invoice Details
```
GET /api/billing/invoices/:id
```

**Auth**: Required

**Response** (200):
```json
{
  "message": "Invoice retrieved successfully",
  "invoice": {
    "_id": "507f1f77bcf86cd799439023",
    "invoice_number": "INV202601-0001",
    "patient_id": { "name": "John Doe", "patient_id": "P2026-00001" },
    "clinic_id": { "name": "Apollo Hospital" },
    "line_items": [
      {
        "description": "Doctor Consultation",
        "type": "service",
        "quantity": 1,
        "unit_price": 500
      }
    ],
    "subtotal": 800,
    "tax": 40,
    "total": 840,
    "amount_paid": 0,
    "balance_due": 840,
    "status": "pending",
    "issue_date": "2026-01-03",
    "due_date": "2026-01-17"
  }
}
```

---

### 36. Record Payment
```
POST /api/billing/payments
```

**Auth**: Required (Staff, Patient)

**Request Body**:
```json
{
  "invoice_id": "507f1f77bcf86cd799439023",
  "amount": 840,
  "payment_method": "card",
  "transaction_reference": "TXN20260103001",
  "card_details": {
    "card_number": "1111-2222-3333-4444",
    "cardholder_name": "John Doe",
    "expiry": "12/26"
  }
}
```

**Response** (201):
```json
{
  "message": "Payment recorded successfully",
  "payment": {
    "_id": "507f1f77bcf86cd799439024",
    "receipt_number": "RCP202601-0001",
    "invoice_id": "507f1f77bcf86cd799439023",
    "amount": 840,
    "payment_method": "card",
    "payment_date": "2026-01-03",
    "status": "success"
  }
}
```

---

### 37. Get Invoice Payments
```
GET /api/billing/payments/invoice/:invoiceId
```

**Auth**: Required

**Response** (200):
```json
{
  "message": "Payments retrieved successfully",
  "payments": [
    {
      "_id": "507f1f77bcf86cd799439024",
      "receipt_number": "RCP202601-0001",
      "amount": 840,
      "payment_method": "card",
      "payment_date": "2026-01-03",
      "status": "success"
    }
  ],
  "total": 1,
  "total_amount": 840
}
```

---

### 38. Create Insurance Policy
```
POST /api/billing/insurance-policies
```

**Auth**: Required (Admin, Staff)

**Request Body**:
```json
{
  "patient_id": "507f1f77bcf86cd799439013",
  "policy_number": "POL123456789",
  "provider_name": "HDFC Insurance",
  "coverage_percentage": 80,
  "deductible": 5000,
  "co_payment": 500,
  "valid_from": "2026-01-01",
  "valid_till": "2027-01-01",
  "coverage_items": ["Consultation", "Tests", "Hospitalization"]
}
```

**Response** (201):
```json
{
  "message": "Insurance policy created successfully",
  "insurance_policy": {
    "_id": "507f1f77bcf86cd799439025",
    "policy_number": "POL123456789",
    "provider_name": "HDFC Insurance",
    "coverage_percentage": 80,
    "status": "active"
  }
}
```

---

### 39. Create Insurance Claim
```
POST /api/billing/insurance-claims
```

**Auth**: Required (Doctor, Staff)

**Request Body**:
```json
{
  "invoice_id": "507f1f77bcf86cd799439023",
  "insurance_policy_id": "507f1f77bcf86cd799439025",
  "claimed_amount": 840,
  "supporting_documents": [
    {
      "document_type": "prescription",
      "document_url": "https://storage/doc1.pdf"
    },
    {
      "document_type": "receipt",
      "document_url": "https://storage/doc2.pdf"
    }
  ]
}
```

**Response** (201):
```json
{
  "message": "Insurance claim created successfully",
  "insurance_claim": {
    "_id": "507f1f77bcf86cd799439026",
    "claim_number": "CLM202601-0001",
    "invoice_id": "507f1f77bcf86cd799439023",
    "claimed_amount": 840,
    "status": "draft"
  }
}
```

---

### 40. Get Patient Claims
```
GET /api/billing/insurance-claims/patient/:patientId?page=1&limit=10&status=approved
```

**Auth**: Required

**Query Params**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string: draft, submitted, under_review, approved, rejected, settled)

**Response** (200):
```json
{
  "message": "Insurance claims retrieved successfully",
  "claims": [
    {
      "_id": "507f1f77bcf86cd799439026",
      "claim_number": "CLM202601-0001",
      "invoice_id": { "invoice_number": "INV202601-0001" },
      "claimed_amount": 840,
      "approved_amount": 672,
      "status": "approved"
    }
  ],
  "total": 5
}
```

---

### 41. Update Claim Status
```
PUT /api/billing/insurance-claims/:id/status
```

**Auth**: Required (Admin, Finance)

**Request Body**:
```json
{
  "status": "approved",
  "approved_amount": 672,
  "notes": "Approved by insurance - 20% deductible"
}
```

**Response** (200):
```json
{
  "message": "Insurance claim status updated successfully",
  "insurance_claim": {
    "_id": "507f1f77bcf86cd799439026",
    "claim_number": "CLM202601-0001",
    "status": "approved",
    "approved_amount": 672
  }
}
```

---

## 💬 Chatbot Endpoints

### 42. Create Chat Session
```
POST /api/chat/sessions
```

**Auth**: Optional (Patient)

**Request Body**:
```json
{
  "patient_id": "507f1f77bcf86cd799439013",
  "topic": "appointment_inquiry"
}
```

**Response** (201):
```json
{
  "message": "Chat session created successfully",
  "session": {
    "_id": "507f1f77bcf86cd799439027",
    "patient_id": "507f1f77bcf86cd799439013",
    "status": "active",
    "intent": null,
    "resolved": false
  }
}
```

---

### 43. Get All Chat Sessions
```
GET /api/chat/sessions?page=1&limit=10&status=active
```

**Auth**: Required

**Query Params**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string: active, closed, handed_off)

**Response** (200):
```json
{
  "message": "Chat sessions retrieved successfully",
  "sessions": [
    {
      "_id": "507f1f77bcf86cd799439027",
      "patient_id": { "name": "John Doe" },
      "status": "active",
      "intent": "appointment_inquiry",
      "resolved": false,
      "created_at": "2026-01-03T10:00:00Z"
    }
  ],
  "total": 45
}
```

---

### 44. Send Chat Message
```
POST /api/chat/sessions/:sessionId/messages
```

**Auth**: Required (Patient, Staff)

**Request Body**:
```json
{
  "message": "I want to book an appointment with Dr. Smith",
  "sender": "patient"
}
```

**Response** (201):
```json
{
  "message": "Message sent successfully",
  "user_message": {
    "_id": "507f1f77bcf86cd799439028",
    "session_id": "507f1f77bcf86cd799439027",
    "message": "I want to book an appointment with Dr. Smith",
    "sender": "patient"
  },
  "bot_response": {
    "_id": "507f1f77bcf86cd799439029",
    "message": "I can help you book an appointment. Which doctor would you like to see? We have cardiology, orthopedics, and pediatrics specialists available.",
    "sender": "bot",
    "quick_replies": ["Dr. Smith", "Dr. Johnson", "Change specialty"],
    "intent_detected": "appointment_booking",
    "confidence_score": 0.95
  }
}
```

---

### 45. Get Chat History
```
GET /api/chat/sessions/:sessionId/messages?page=1&limit=50
```

**Auth**: Required

**Response** (200):
```json
{
  "message": "Chat history retrieved successfully",
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439028",
      "message": "I want to book an appointment with Dr. Smith",
      "sender": "patient",
      "timestamp": "2026-01-03T10:00:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439029",
      "message": "I can help you book an appointment. Which doctor would you like to see?",
      "sender": "bot",
      "quick_replies": ["Dr. Smith", "Dr. Johnson"],
      "timestamp": "2026-01-03T10:00:05Z"
    }
  ],
  "total": 12
}
```

---

### 46. End Chat Session
```
PUT /api/chat/sessions/:sessionId/end
```

**Auth**: Required (Patient, Staff)

**Request Body**:
```json
{
  "resolved": true,
  "feedback": "Very helpful",
  "rating": 5
}
```

**Response** (200):
```json
{
  "message": "Chat session ended successfully",
  "session": {
    "_id": "507f1f77bcf86cd799439027",
    "status": "closed",
    "resolved": true,
    "rating": 5,
    "feedback": "Very helpful"
  }
}
```

---

## 🔑 Authentication Header

For all protected endpoints, include:

```
Authorization: Bearer <token>
```

Example:
```bash
curl -X GET http://localhost:5000/api/patients \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📊 Error Response Format

All error responses follow this format:

```json
{
  "message": "Error description",
  "error": "Detailed error message",
  "code": "ERROR_CODE"
}
```

**Common Status Codes**:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Server Error

---

## 🚀 View Interactive Swagger UI

After starting the server:

```bash
npm run dev
```

Visit: **http://localhost:5000/api-docs**

You can:
- ✅ View all endpoints with descriptions
- ✅ Try endpoints directly in the browser
- ✅ See request/response examples
- ✅ Check authentication requirements
- ✅ Download OpenAPI spec (JSON/YAML)

---

**Total Endpoints: 46**  
**Last Updated: January 3, 2026**
