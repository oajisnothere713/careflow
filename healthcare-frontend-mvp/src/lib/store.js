import { create } from "zustand";
import { persist } from "zustand/middleware";

const useStore = create(
  persist(
    (set) => ({
      // Role management
      currentRole: "super_admin",
      setCurrentRole: (role) => set({ currentRole: role }),

      // Context selectors
      selectedClinic: null,
      setSelectedClinic: (clinic) => set({ selectedClinic: clinic }),
      selectedDoctor: null,
      setSelectedDoctor: (doctor) => set({ selectedDoctor: doctor }),

      // Data caches
      clinics: [],
      setClinics: (clinics) => set({ clinics }),
      doctors: [],
      setDoctors: (doctors) => set({ doctors }),
    }),
    {
      name: "healthcare-store", // localStorage key
      partialize: (state) => ({
        currentRole: state.currentRole,
        selectedClinic: state.selectedClinic,
        selectedDoctor: state.selectedDoctor,
      }),
    }
  )
);

export default useStore;
