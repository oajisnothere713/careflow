"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FiMic, FiSquare } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { createSpeechRecognition } from "@/lib/speech";

const MAX_DURATION = 10 * 60; // 10 minutes in seconds

export default function RecordingPanel({
  appointmentId,
  onCancel,
  onTranscriptReady,
}) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptRef = useRef("");

  const startRecording = useCallback(() => {
    const rec = createSpeechRecognition({
      language: "en-IN",
      onInterim: (text) => setInterim(text),
      onFinal: (text) => {
        transcriptRef.current += (transcriptRef.current ? " " : "") + text;
        setTranscript(transcriptRef.current);
        setInterim("");
      },
      onError: (err) => toast.error(`Speech error: ${err}`),
      onEnd: () => {},
    });

    if (!rec) {
      toast.error("Web Speech API not supported. Use Chrome or Edge.");
      return;
    }

    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= MAX_DURATION) {
          stopRecording();
          return MAX_DURATION;
        }
        return prev + 1;
      });
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleProcess = async () => {
    const finalTranscript = transcriptRef.current;
    if (!finalTranscript.trim()) {
      toast.error("No transcript to process");
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post("/ai/process-transcript", {
        transcript: finalTranscript,
        appointment_id: appointmentId,
      });

      // Transform API response to match AIReviewPanel expectations
      const aiConsultation = res.data.aiConsultation;
      const transformedData = {
        consultation: {
          _id: aiConsultation._id,
          patient_summary: aiConsultation.patient_summary || "",
          doctor_summary: aiConsultation.doctor_summary || "",
          summary:
            aiConsultation.summary || aiConsultation.doctor_summary || "",
          chief_complaint: aiConsultation.chief_complaint || "",
          diagnosis: aiConsultation.diagnosis || "",
          prescription_data: (aiConsultation.prescription_data || []).map(
            (p) => ({
              name: p.medicine_name || p.name || "",
              dosage: p.dosage || "",
              frequency: p.frequency || "",
              duration: p.duration || "",
              instructions: p.instructions || "",
            }),
          ),
          follow_up_date: aiConsultation.follow_up_date || "",
        },
      };

      onTranscriptReady(transformedData);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to process transcript",
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const remaining = MAX_DURATION - elapsed;

  return (
    <div className="p-5">
      <h4 className="font-semibold mb-4">Consultation Recording</h4>

      {/* Timer */}
      <div className="text-center mb-4">
        <div
          className={`text-4xl font-mono ${remaining < 60 ? "text-red-500" : "text-gray-800"}`}
        >
          {formatTime(elapsed)}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {recording ? `${formatTime(remaining)} remaining` : "Ready to record"}
        </div>
      </div>

      {/* Record / Stop button */}
      <div className="flex justify-center mb-6">
        {!recording ? (
          <button
            onClick={startRecording}
            className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105"
            style={{ background: "var(--danger)" }}
          >
            <FiMic size={28} />
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse transition-transform hover:scale-105"
            style={{ background: "var(--danger)" }}
          >
            <FiSquare size={24} />
          </button>
        )}
      </div>

      {/* Live transcript */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Transcript
        </label>
        <div
          className="border rounded-lg p-3 min-h-[120px] max-h-[300px] overflow-auto text-sm bg-gray-50"
          style={{ borderColor: "var(--border)" }}
        >
          {transcript || (
            <span className="text-gray-300">
              Speak to see transcript appear here...
            </span>
          )}
          {interim && <span className="text-gray-400 italic"> {interim}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          style={{ borderColor: "var(--border)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleProcess}
          disabled={!transcript.trim() || recording || processing}
          className="flex-1 px-4 py-2 text-sm text-white rounded-md disabled:opacity-50 transition-all"
          style={{ background: "var(--primary)" }}
        >
          {processing ? "Sending to AI..." : "Send to AI"}
        </button>
      </div>

      {/* Auto-Detect Info */}
      <div
        className="mt-4 p-3 rounded-lg bg-blue-50 border"
        style={{ borderColor: "#90CAF9" }}
      >
        <p className="text-xs text-blue-700 leading-relaxed">
          🎤 <strong>Auto-detects language</strong> - Speak in English, Hindi,
          or Hinglish. Claude AI will understand and respond in the same
          language.
        </p>
      </div>
    </div>
  );
}
