import api from "@/lib/api";

export const getAppointments = (clinicId) => api.get(`/appointments${clinicId ? `?clinic_id=${clinicId}` : ''}`);
export const createAppointment = (data) => api.post("/appointments", data);
export const updateAppointment = (id, data) => api.put(`/appointments/${id}`, data);
export const updateAppointmentStatus = (id, status) => api.patch(`/appointments/${id}/status`, { status });
export const deleteAppointment = (id) => api.delete(`/appointments/${id}`);
