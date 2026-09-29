"use client";

import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "@/lib/api";
import PatientLookupForm from "./forms/PatientLookupForm";
import PatientCardList from "./cards/PatientCardList";
import AppointmentBookingForm from "./forms/AppointmentBookingForm";

const STEPS = {
  LOOKUP: "lookup",
  SELECT: "select",
  NEW_PATIENT: "new_patient",
  BOOKING: "booking",
};

import { BLOOD_GROUPS } from "@/lib/constants";

export default function PatientRegistrationFlowPage({ clinicId, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(STEPS.LOOKUP);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchedPatients, setSearchedPatients] = useState([]);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientForm, setNewPatientForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "male",
    date_of_birth: "",
    blood_group: "",
    address: "",
    emergency_contact: "",
  });
  const [creatingPatient, setCreatingPatient] = useState(false);

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setCurrentStep(STEPS.BOOKING);
  };

  const handleCreateNew = (name) => {
    setNewPatientName(name);
    setNewPatientForm((prev) => ({ ...prev, name }));
    setCurrentStep(STEPS.NEW_PATIENT);
  };

  const handleSearchResults = (results) => {
    setSearchedPatients(results);
  };

  const handleNewPatientSubmit = async (formData) => {
    setCreatingPatient(true);
    try {
      const res = await api.post("/patients/onboard", {
        ...formData,
        targetClinicId: clinicId,
      });
      const newPatient = res.data?.patient || res.data;
      setSelectedPatient(newPatient);
      toast.success("Patient created successfully!");
      setCurrentStep(STEPS.BOOKING);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create patient");
    } finally {
      setCreatingPatient(false);
    }
  };

  const handleBookingSuccess = () => {
    toast.success("Appointment booked successfully!");
    onSuccess?.();
  };

  const goBack = () => {
    if (currentStep === STEPS.BOOKING) {
      if (selectedPatient && !selectedPatient.patient_id) {
        // New patient was created, go back to create
        setCurrentStep(STEPS.NEW_PATIENT);
      } else if (searchedPatients.length > 1) {
        // Multiple matches - go back to selection
        setSelectedPatient(null);
        setCurrentStep(STEPS.SELECT);
      } else {
        // Single match or new - go back to lookup
        setSelectedPatient(null);
        setSearchedPatients([]);
        setCurrentStep(STEPS.LOOKUP);
      }
    } else if (currentStep === STEPS.SELECT) {
      setSelectedPatient(null);
      setSearchedPatients([]);
      setCurrentStep(STEPS.LOOKUP);
    } else if (currentStep === STEPS.NEW_PATIENT) {
      setCurrentStep(STEPS.LOOKUP);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case STEPS.LOOKUP:
        return "Find Patient";
      case STEPS.SELECT:
        return "Confirm Your Identity";
      case STEPS.NEW_PATIENT:
        return "Create New Patient";
      case STEPS.BOOKING:
        return "Book Appointment";
      default:
        return "Patient Registration";
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case STEPS.LOOKUP:
      case STEPS.SELECT:
        return 1;
      case STEPS.NEW_PATIENT:
        return 2;
      case STEPS.BOOKING:
        return 3;
      default:
        return 1;
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-start gap-6 mb-8">
            {currentStep !== STEPS.LOOKUP && (
              <button
                onClick={goBack}
                className="p-3 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0 mt-2"
              >
                <FiArrowLeft size={28} className="text-gray-800" />
              </button>
            )}
            <div className="flex-1">
              <div className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                Step {getStepNumber()} of 3
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mt-3 mb-2">
                {getStepTitle()}
              </h1>
              <p className="text-gray-600 text-lg">
                {currentStep === STEPS.LOOKUP &&
                  "Search for your name to find your existing patient record"}
                {currentStep === STEPS.SELECT &&
                  "Select which one is you from the list below"}
                {currentStep === STEPS.NEW_PATIENT &&
                  "Fill in your details to create a new patient record"}
                {currentStep === STEPS.BOOKING &&
                  "Complete your appointment booking"}
              </p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden shadow-sm">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 transition-all duration-500 rounded-full shadow-lg"
              style={{ width: `${(getStepNumber() / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl shadow-xl p-12 border border-gray-100">
          {currentStep === STEPS.LOOKUP && (
            <PatientLookupForm
              clinicId={clinicId}
              onSelect={(patient) => {
                setSelectedPatient(patient);
                setCurrentStep(STEPS.BOOKING);
              }}
              onCreateNew={handleCreateNew}
              onSearchResults={(results) => {
                handleSearchResults(results);
              }}
            />
          )}

          {currentStep === STEPS.SELECT && searchedPatients.length > 0 && (
            <div className="space-y-6">
              <p className="text-gray-700 text-lg">
                We found{" "}
                <span className="font-bold text-blue-600">
                  {searchedPatients.length}
                </span>{" "}
                patient(s) matching your name.
                <br />
                <span className="text-gray-600">
                  Please select which one is you:
                </span>
              </p>
              <PatientCardList
                patients={searchedPatients}
                selectedPatientId={selectedPatient?._id}
                onSelectPatient={handlePatientSelect}
              />
            </div>
          )}

          {currentStep === STEPS.NEW_PATIENT && (
            <NewPatientForm
              initialData={newPatientForm}
              loading={creatingPatient}
              onSubmit={handleNewPatientSubmit}
            />
          )}

          {currentStep === STEPS.BOOKING && selectedPatient && (
            <AppointmentBookingForm
              clinicId={clinicId}
              patientData={selectedPatient}
              onBack={goBack}
              onSuccess={handleBookingSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// New Patient Form Component
function NewPatientForm({ initialData, loading, onSubmit }) {
  const [form, setForm] = useState(initialData);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone *
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            value={form.gender}
            onChange={(e) => handleChange("gender", e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => handleChange("date_of_birth", e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Blood Group *
        </label>
        <select
          value={form.blood_group}
          onChange={(e) => handleChange("blood_group", e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ borderColor: "var(--border)" }}
        >
          <option value="">Select blood group...</option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg}>
              {bg}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 text-sm text-white rounded-md disabled:opacity-50"
          style={{ background: "var(--primary)" }}
        >
          {loading ? "Creating..." : "Create & Continue"}
        </button>
      </div>
    </form>
  );
}
