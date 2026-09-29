import api from "@/lib/api";

export const getConsultations = (clinicId) => api.get(`/consultations${clinicId ? `?clinic_id=${clinicId}` : ''}`);
export const createConsultation = (data) => api.post("/consultations", data);
export const getConsultationById = (id) => api.get(`/consultations/${id}`);
export const updateConsultation = (id, data) => api.put(`/consultations/${id}`, data);
export const endConsultation = (id) => api.post(`/consultations/${id}/end`);
