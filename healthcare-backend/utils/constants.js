const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CLINIC_ADMIN: 'clinic_admin',
  DOCTOR: 'doctor',
  PATIENT: 'patient'
};

const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
};

const CONSULTATION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

module.exports = {
  ROLES,
  APPOINTMENT_STATUS,
  CONSULTATION_STATUS
};
