import api from "@/lib/api";

export const getClinics = () => api.get("/clinics");
export const createClinic = (data) => api.post("/clinics", data);
export const updateClinic = (id, data) => api.put(`/clinics/${id}`, data);
export const deleteClinic = (id) => api.delete(`/clinics/${id}`);
export const getClinicProfile = (id) => api.get(`/clinics/${id}/profile`);
