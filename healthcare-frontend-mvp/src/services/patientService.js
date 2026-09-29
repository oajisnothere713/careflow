import api from "@/lib/api";

export const getPatients = () => api.get("/patients");
export const getClinicPatients = (clinicId) => api.get(`/patients?clinic=${clinicId}`);
export const createPatient = (data) => api.post("/patients", data);
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data);
export const deletePatient = (id) => api.delete(`/patients/${id}`);
export const getPatientProfile = (id) => api.get(`/patients/${id}/profile`);
export const lookupPatients = (query) => api.get(`/patients/search?q=${query}`);
