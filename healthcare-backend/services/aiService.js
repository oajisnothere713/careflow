/**
 * AI Service — Anthropic Claude API with multilingual support (English, Hindi, Hinglish)
 * Generates consultation summary, prescription, and follow-up date from transcripts
 * Uses native Node.js fetch (available in Node 18+)
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Detect language in transcript (English, Hindi, or Hinglish)
 * @param {string} text - Text to analyze
 * @returns {string} 'english', 'hindi', or 'hinglish'
 */
function detectLanguage(text) {
  // Check for Hindi script (Devanagari)
  const hindiPattern = /[\u0900-\u097F]/g;
  const hindiMatches = text.match(hindiPattern) || [];
  const hindiRatio = hindiMatches.length / text.length;

  if (hindiRatio > 0.3) {
    // More than 30% Hindi script = likely Hindi or Hinglish
    if (hindiRatio > 0.7) return "hindi";
    return "hinglish";
  }
  return "english";
}

const SYSTEM_PROMPT = `You are a medical consultation AI assistant specializing in Indian healthcare.

You will receive a raw doctor-patient conversation transcript. The transcript is a single mixed stream — speakers are NOT labeled. You must INFER who is the patient and who is the doctor based on context:
- PATIENT typically: describes symptoms, mentions duration of illness, reports pain, asks questions about their condition.
- DOCTOR typically: asks clinical questions, gives diagnoses, prescribes medicines, recommends tests, sets follow-up dates, gives medical advice.

**CRITICAL: ALWAYS respond in ENGLISH only. All output must be in English regardless of the input language.**

You MUST respond with valid JSON only (no markdown, no code fences). Use this exact structure:
{
  "patient_summary": "A concise ~100-word summary IN ENGLISH of what the PATIENT communicated: their symptoms, complaints, history, concerns, and questions.",
  "doctor_summary": "A concise ~100-word summary IN ENGLISH of what the DOCTOR said: their assessment, diagnosis, treatment advice, and instructions.",
  "prescription": [
    {
      "medicine_name": "Medicine Name (use common English names, e.g., Paracetamol, Amoxicillin)",
      "dosage": "e.g., 500mg",
      "frequency": "e.g., Twice daily",
      "duration": "e.g., 7 days",
      "instructions": "e.g., Take after meals"
    }
  ],
  "follow_up_date": "YYYY-MM-DD or null if no follow-up needed",
  "diagnosis": "Primary diagnosis (in ENGLISH)",
  "chief_complaint": "Main reason for visit (in ENGLISH)"
}

IMPORTANT RULES:
- Input may be in English, Hindi, or Hinglish (mixed language)
- YOU MUST UNDERSTAND all input languages but ALWAYS OUTPUT IN ENGLISH
- Do NOT output any Hindi, Hinglish, or other language - English only
- patient_summary: ONLY covers what the patient communicated (~100 words)
- doctor_summary: ONLY covers what the doctor said (~100 words)
- prescription: ONLY medicines that the DOCTOR prescribed or recommended — do NOT include anything the patient merely mentioned
- follow_up_date: ONLY if the DOCTOR mentioned a follow-up date or period; realistic, typically 1-4 weeks from today; null otherwise
- Medication names: Use English/common names only (e.g., Paracetamol, not Dolo; Amoxicillin, not Amoxil)
- Dosages: Use metric system (mg, ml, etc.)
- Conservative with prescriptions: only include explicitly mentioned or clearly indicated medicines
- Always output valid JSON in UTF-8 encoding
- Every field must be in ENGLISH

CRITICAL PRESCRIPTION RULES — you MUST follow these:
- For EVERY prescribed medicine, you MUST extract dosage, frequency, duration, and instructions from the conversation.
- dosage: The amount per dose (e.g., "500mg", "1 tablet", "5ml syrup"). If the doctor says a brand name without a specific mg, use the medicine's most common adult form (e.g., "1 tablet").
- frequency: How often to take it (e.g., "Twice daily", "Once daily", "Three times daily", "Every 8 hours"). Listen for Hindi cues like "subah shaam" (morning-evening = "Twice daily, morning and evening"), "din mein teen baar" = "Three times daily".
- duration: How long to take it (e.g., "5 days", "7 days", "2 weeks"). Listen for "do din" = "2 days", "ek hafta" = "1 week".
- instructions: When/how to take it (e.g., "After meals", "Before sleep", "With warm water"). Listen for "khana khane ke baad" = "After meals".
- NEVER leave dosage, frequency, or duration as empty strings. If the doctor gave any administration detail, you must populate the relevant field.
- If a specific detail is genuinely not mentioned at all in the conversation, set the value to a reasonable clinical default based on the medicine (e.g., Azithromycin → dosage: "500mg", frequency: "Once daily", duration: "3 days", instructions: "After meals").
- ABSOLUTELY NEVER use vague placeholder phrases for ANY prescription field. The following are STRICTLY FORBIDDEN in dosage, frequency, duration, or instructions: "As prescribed", "As directed", "Prescribed", "As recommended", "Per prescription", "As advised", "As per doctor", "Take as prescribed", "Use as directed". You MUST always provide a specific, concrete value (e.g., "500mg", "Twice daily", "5 days", "After meals"). If the doctor only said "take this medicine" without details, use a reasonable clinical default for that medicine — NEVER fall back to "As prescribed".`;

/**
 * Generate consultation data from a transcript using Claude
 * Supports English, Hindi, and Hinglish (mixed language) conversations
 * @param {string} transcript - Raw conversation transcript (English, Hindi, or Hinglish)
 * @param {object} patientHistory - Optional patient history context
 * @returns {object} { summary, prescription, followUpDate, diagnosis, chiefComplaint, detectedLanguage }
 */
async function generateConsultationData(transcript, patientHistory = null) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  let userMessage = `Here is the doctor-patient consultation transcript (speakers are NOT labeled — infer patient vs doctor from context):\n\n${transcript}`;

  if (patientHistory) {
    userMessage += `\n\nPatient History Context:\n${JSON.stringify(patientHistory, null, 2)}`;
  }

  userMessage += `\n\nToday's date: ${new Date().toISOString().split("T")[0]}`;
  userMessage += "\n\nGenerate the structured consultation data as JSON.";

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      temperature: 0.0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Anthropic API error");
  }

  const outputText = data.content?.[0]?.text || "";

  // Parse JSON from response (handle potential markdown wrapping)
  let parsed;
  try {
    const jsonStr = outputText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse AI response:", outputText);
    throw new Error("Failed to parse AI-generated consultation data");
  }

  const detectedLanguage = detectLanguage(transcript);

  return {
    summary: parsed.doctor_summary || parsed.summary || "",
    patientSummary: parsed.patient_summary || "",
    doctorSummary: parsed.doctor_summary || parsed.summary || "",
    prescription: Array.isArray(parsed.prescription) ? parsed.prescription : [],
    followUpDate: parsed.follow_up_date || null,
    diagnosis: parsed.diagnosis || "",
    chiefComplaint: parsed.chief_complaint || "",
    detectedLanguage: detectedLanguage,
  };
}

module.exports = { generateConsultationData };
