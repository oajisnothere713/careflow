import api from "@/lib/api";

export const getDoctors = () => api.get("/doctors");
export const getClinicDoctors = (clinicId) => api.get(`/doctors?clinic=${clinicId}`);
export const createDoctor = (data) => api.post("/doctors", data);
export const updateDoctor = (id, data) => api.put(`/doctors/${id}`, data);
export const deleteDoctor = (id) => api.delete(`/doctors/${id}`);
export const getDoctorProfile = (id) => api.get(`/doctors/${id}/profile`);
