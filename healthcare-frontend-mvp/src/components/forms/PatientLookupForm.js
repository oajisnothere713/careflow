"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";

// Fuzzy match helper - flexible matching for partial names
const fuzzyMatch = (searchTerm, text) => {
  if (!text) return false;

  const search = searchTerm.toLowerCase().trim();
  const compare = text.toLowerCase().trim();

  // Exact match
  if (compare === search) return true;

  // Contains match (e.g., "prash" matches "prashant")
  if (compare.includes(search)) return true;

  // Word boundary match (e.g., "pra" matches "prashant", "khan" matches "faisal khan")
  const searchWords = search.split(/\s+/);
  const compareWords = compare.split(/\s+/);

  return searchWords.every((word) =>
    compareWords.some((compWord) => compWord.startsWith(word)),
  );
};

import { getInitials, getAvatarColor } from "@/lib/utils";

export default function PatientLookupForm({
  clinicId,
  onSelect,
  onCreateNew,
  onSearchResults,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [allPatients, setAllPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Refs to avoid stale closures and prevent infinite re-render loops
  const debounceRef = useRef(null);
  const onSearchResultsRef = useRef(onSearchResults);
  useEffect(() => {
    onSearchResultsRef.current = onSearchResults;
  });

  // Fetch all patients once when component mounts
  useEffect(() => {
    const fetchAllPatients = async () => {
      try {
        const res = await api.get("/patients", {
          params: { clinic_id: clinicId, limit: 1000 },
        });
        const allPatientsData = res.data?.patients || res.data || [];
        setAllPatients(allPatientsData);
      } catch (err) {
        console.error("Failed to fetch patients:", err);
        setAllPatients([]);
      } finally {
        setLoadingInitial(false);
      }
    };

    if (clinicId) {
      fetchAllPatients();
    }
  }, [clinicId]);

  // Client-side fuzzy filtering — onSearchResults kept in ref, NOT in deps to prevent infinite loop
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchTerm.trim()) {
      setFilteredPatients([]);
      onSearchResultsRef.current?.([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      const filtered = allPatients.filter((patient) => {
        const name = patient.user_id?.name || patient.name || "";
        const email = patient.email || patient.user_id?.email || "";
        const phone = patient.phone || patient.user_id?.phone || "";

        return (
          fuzzyMatch(searchTerm, name) ||
          fuzzyMatch(searchTerm, email) ||
          fuzzyMatch(searchTerm, phone)
        );
      });

      setFilteredPatients(filtered);
      onSearchResultsRef.current?.(filtered);
      setLoading(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, allPatients]); // onSearchResults intentionally excluded — stored in ref

  const handleSelectPatient = (patient) => {
    onSelect(patient);
  };

  const handleCreateNew = () => {
    onCreateNew(searchTerm);
  };

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
        <span className="ml-3 text-gray-600 font-medium">
          Loading patients...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Patient Name, Email, or Phone *
        </label>
        <input
          type="text"
          placeholder="Enter patient name, email, or phone number"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
          style={{
            borderColor: searchTerm ? "var(--primary)" : "var(--border)",
          }}
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-2">
          💡 Type any part of the name, email, or phone number
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
          <span className="ml-3 text-gray-600 font-medium">Searching...</span>
        </div>
      )}

      {!loading && searchTerm && filteredPatients.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">
            ✓ Found{" "}
            <span className="text-blue-600">{filteredPatients.length}</span>{" "}
            patient(s) — click one to select:
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 border border-gray-200 rounded-xl p-2 bg-gray-50">
            {filteredPatients.map((patient) => {
              const patientName = patient.user_id?.name || patient.name;
              const initials = getInitials(patientName);

              return (
                <button
                  key={patient._id}
                  onClick={() => handleSelectPatient(patient)}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group bg-white flex items-center gap-3"
                >
                  {/* Avatar with initials */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getAvatarColor(
                      patientName,
                    )}`}
                  >
                    {initials}
                  </div>

                  {/* Patient info */}
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                      {patientName}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                      {patient.email && <div>📧 {patient.email}</div>}
                      {patient.phone && <div>📱 {patient.phone}</div>}
                      {patient.patient_id && (
                        <div>🆔 MRN: {patient.patient_id}</div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 text-center">
            Patient not in the list?
          </p>
          <button
            type="button"
            onClick={handleCreateNew}
            className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all"
            style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
          >
            + Register as New Patient
          </button>
        </div>
      )}

      {!loading && searchTerm && filteredPatients.length === 0 && (
        <div className="space-y-4 p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
          <p className="text-gray-700 font-medium">
            ❌ No patients found matching "{searchTerm}"
          </p>
          <p className="text-sm text-gray-600">
            Tips:
            <br />• Try searching by partial name (e.g., "Pra" for "Prashant")
            <br />• Or search by email/phone number
            <br />• Or create a new patient below
          </p>
          <button
            type="button"
            onClick={handleCreateNew}
            className="w-full px-4 py-3 text-base font-semibold rounded-xl text-white transition-all"
            style={{ background: "var(--primary)" }}
          >
            + Create New Patient
          </button>
        </div>
      )}
    </div>
  );
}
