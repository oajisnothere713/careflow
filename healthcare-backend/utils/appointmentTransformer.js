/**
 * Appointment Response Transformer
 * Converts appointment documents into role-specific response formats
 * Handles ID consolidation and field filtering based on user role
 */

/**
 * Transform appointment for patient view
 * Patients see: doctor profile, clinic location, appointment time/status, reason/notes
 */
const transformForPatient = (appointment) => {
  if (!appointment) return null;

  return {
    _id: appointment._id,
    appointment_date: appointment.appointment_date,
    appointment_time: appointment.appointment_time,
    duration_minutes: appointment.duration_minutes,
    status: appointment.status,
    visit_type: appointment.visit_type,
    priority: appointment.priority,
    reason_for_visit: appointment.reason_for_visit,
    symptoms: appointment.symptoms || [],
    notes: appointment.notes,
    booking_source: appointment.booking_source,
    doctor: appointment.doctor_id ? {
      _id: appointment.doctor_id._id,
      name: appointment.doctor_id.user_id?.name || appointment.doctor_id.user_id,
      specialization: appointment.doctor_id.specialization,
      consultation_fee: appointment.doctor_id.consultation_fee,
      experience_years: appointment.doctor_id.experience_years,
      phone: appointment.doctor_id.user_id?.phone
    } : null,
    clinic: appointment.clinic_id ? {
      _id: appointment.clinic_id._id,
      name: appointment.clinic_id.name,
      address: appointment.clinic_id.address,
      contact: appointment.clinic_id.contact
    } : null,
    created_at: appointment.createdAt,
    updated_at: appointment.updatedAt,
    cancelled_reason: appointment.cancelled_reason,
    cancelled_at: appointment.cancelled_at
  };
};

/**
 * Transform appointment for doctor view
 * Doctors see: patient details, appointment time/status, reason/symptoms/priority, medical history
 */
const transformForDoctor = (appointment) => {
  if (!appointment) return null;

  return {
    _id: appointment._id,
    appointment_date: appointment.appointment_date,
    appointment_time: appointment.appointment_time,
    duration_minutes: appointment.duration_minutes,
    status: appointment.status,
    visit_type: appointment.visit_type,
    priority: appointment.priority,
    reason_for_visit: appointment.reason_for_visit,
    symptoms: appointment.symptoms || [],
    notes: appointment.notes,
    booked_by: appointment.booked_by,
    booking_source: appointment.booking_source,
    patient: appointment.patient_id ? {
      _id: appointment.patient_id._id,
      name: appointment.patient_id.user_id?.name || appointment.patient_id.user_id,
      email: appointment.patient_id.user_id?.email,
      phone: appointment.patient_id.user_id?.phone,
      gender: appointment.patient_id.gender,
      date_of_birth: appointment.patient_id.date_of_birth,
      blood_group: appointment.patient_id.blood_group,
      address: appointment.patient_id.address,
      emergency_contact: appointment.patient_id.emergency_contact
    } : null,
    medical_history: appointment.medical_history ? {
      known_conditions: appointment.medical_history.known_conditions || [],
      allergies: appointment.medical_history.allergies || [],
      current_medications: appointment.medical_history.current_medications || [],
      past_surgeries: appointment.medical_history.past_surgeries || [],
      family_history: appointment.medical_history.family_history || []
    } : null,
    clinic: appointment.clinic_id ? {
      _id: appointment.clinic_id._id,
      name: appointment.clinic_id.name,
      address: appointment.clinic_id.address
    } : null,
    created_at: appointment.createdAt,
    updated_at: appointment.updatedAt,
    cancelled_reason: appointment.cancelled_reason,
    cancelled_at: appointment.cancelled_at,
    cancelled_by: appointment.cancelled_by
  };
};

/**
 * Transform appointment for staff/admin view
 * Staff see: all fields for operational purposes
 */
const transformForStaff = (appointment) => {
  if (!appointment) return null;

  return {
    _id: appointment._id,
    appointment_date: appointment.appointment_date,
    appointment_time: appointment.appointment_time,
    duration_minutes: appointment.duration_minutes,
    status: appointment.status,
    visit_type: appointment.visit_type,
    priority: appointment.priority,
    reason_for_visit: appointment.reason_for_visit,
    symptoms: appointment.symptoms || [],
    notes: appointment.notes,
    booking_source: appointment.booking_source,
    booked_by: appointment.booked_by,
    patient: appointment.patient_id ? {
      _id: appointment.patient_id._id,
      name: appointment.patient_id.user_id?.name || appointment.patient_id.user_id,
      email: appointment.patient_id.user_id?.email,
      phone: appointment.patient_id.user_id?.phone,
      gender: appointment.patient_id.gender,
      blood_group: appointment.patient_id.blood_group,
      emergency_contact: appointment.patient_id.emergency_contact
    } : null,
    doctor: appointment.doctor_id ? {
      _id: appointment.doctor_id._id,
      name: appointment.doctor_id.user_id?.name || appointment.doctor_id.user_id,
      specialization: appointment.doctor_id.specialization,
      license_number: appointment.doctor_id.license_number,
      consultation_fee: appointment.doctor_id.consultation_fee
    } : null,
    clinic: appointment.clinic_id ? {
      _id: appointment.clinic_id._id,
      name: appointment.clinic_id.name,
      address: appointment.clinic_id.address,
      contact: appointment.clinic_id.contact
    } : null,
    created_at: appointment.createdAt,
    updated_at: appointment.updatedAt,
    cancelled_reason: appointment.cancelled_reason,
    cancelled_at: appointment.cancelled_at,
    cancelled_by: appointment.cancelled_by,
    rescheduled_from: appointment.rescheduled_from
  };
};

/**
 * Auto-detect user role and apply appropriate transformation
 */
const transformByRole = (appointment, userRole) => {
  if (!appointment) return null;

  switch (userRole) {
    case 'patient':
      return transformForPatient(appointment);
    case 'doctor':
      return transformForDoctor(appointment);
    case 'staff':
    case 'clinic_admin':
    case 'admin':
      return transformForStaff(appointment);
    default:
      return transformForStaff(appointment);
  }
};

/**
 * Transform array of appointments
 */
const transformAppointments = (appointments, userRole) => {
  if (!Array.isArray(appointments)) return [];
  return appointments.map(appt => transformByRole(appt, userRole));
};

module.exports = {
  transformForPatient,
  transformForDoctor,
  transformForStaff,
  transformByRole,
  transformAppointments
};
