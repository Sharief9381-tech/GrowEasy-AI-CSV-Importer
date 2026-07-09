import Groq from "groq-sdk";
import { CRMRecord, CRMStatus, DataSource, SkippedRecord, BatchResult } from "../types/crm";

const BATCH_SIZE = 10;  // smaller batches = less tokens per request
const MAX_RETRIES = 3;

const ALLOWED_CRM_STATUSES: CRMStatus[] = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
];

const ALLOWED_DATA_SOURCES: DataSource[] = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
];

let _groq: Groq | null = null;
function getClient(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

function buildPrompt(headers: string[], rows: Record<string, string>[]): string {
  return `Extract CRM lead data from these CSV rows. Map columns intelligently.

CRM fields: created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description

Rules:
- crm_status: GOOD_LEAD_FOLLOW_UP | DID_NOT_CONNECT | BAD_LEAD | SALE_DONE (map from status/stage columns)
- data_source: leads_on_demand | meridian_tower | eden_park | varah_swamy | sarjapur_plots (or omit)
- mobile_without_country_code: digits only
- SKIP if no email AND no mobile
- Multiple emails/phones: first=primary, rest→crm_note
- created_at: valid JS date string
- Combine first+last name into name

Headers: ${JSON.stringify(headers)}
Rows: ${JSON.stringify(rows)}

Return JSON only: {"results":[{"rowIndex":0,"action":"import","record":{...}},{"rowIndex":1,"action":"skip","reason":"..."}]}`;
}

async function callGroqWithRetry(prompt: string, retries: number = 0): Promise<string> {
  try {
    const response = await getClient().chat.completions.create({
      model: "llama-3.1-8b-instant",  // 8B model — 10x cheaper on tokens
      messages: [
        { role: "system", content: "You are a CRM data extraction assistant. Always respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    return response.choices[0]?.message?.content || "{}";
  } catch (error: unknown) {
    if (retries < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, Math.pow(2, retries) * 1000));
      return callGroqWithRetry(prompt, retries + 1);
    }
    throw error;
  }
}

function sanitizeRecord(record: Partial<CRMRecord>): CRMRecord {
  const s: CRMRecord = {};
  if (record.created_at && !isNaN(new Date(record.created_at).getTime())) s.created_at = record.created_at;
  if (record.name) s.name = String(record.name).trim();
  if (record.email) s.email = String(record.email).trim().toLowerCase();
  if (record.country_code) s.country_code = String(record.country_code).trim();
  if (record.mobile_without_country_code) {
    const d = String(record.mobile_without_country_code).replace(/\D/g, "");
    if (d) s.mobile_without_country_code = d;
  }
  if (record.company) s.company = String(record.company).trim();
  if (record.city) s.city = String(record.city).trim();
  if (record.state) s.state = String(record.state).trim();
  if (record.country) s.country = String(record.country).trim();
  if (record.lead_owner) s.lead_owner = String(record.lead_owner).trim();
  if (record.crm_status && ALLOWED_CRM_STATUSES.includes(record.crm_status)) s.crm_status = record.crm_status;
  if (record.crm_note) s.crm_note = String(record.crm_note).trim();
  if (record.data_source && ALLOWED_DATA_SOURCES.includes(record.data_source as DataSource)) s.data_source = record.data_source as DataSource;
  if (record.possession_time) s.possession_time = String(record.possession_time).trim();
  if (record.description) s.description = String(record.description).trim();
  return s;
}

export async function processCSVWithAI(headers: string[], rows: Record<string, string>[]): Promise<BatchResult> {
  const allRecords: CRMRecord[] = [];
  const allSkipped: SkippedRecord[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batchRows = rows.slice(i, i + BATCH_SIZE);
    try {
      const raw = await callGroqWithRetry(buildPrompt(headers, batchRows));
      let parsed: { results: Array<{ rowIndex: number; action: "import" | "skip"; record?: Partial<CRMRecord>; reason?: string }> };
      try { parsed = JSON.parse(raw); }
      catch {
        batchRows.forEach((d, idx) => allSkipped.push({ rowIndex: i + idx, reason: "AI returned invalid JSON", originalData: d }));
        continue;
      }
      for (const item of parsed.results) {
        const idx = i + item.rowIndex;
        const orig = batchRows[item.rowIndex] || {};
        if (item.action === "import" && item.record) {
          const rec = sanitizeRecord(item.record);
          if (!rec.email && !rec.mobile_without_country_code) {
            allSkipped.push({ rowIndex: idx, reason: "No valid email or mobile after processing", originalData: orig });
          } else {
            allRecords.push(rec);
          }
        } else {
          allSkipped.push({ rowIndex: idx, reason: item.reason || "Skipped by AI", originalData: orig });
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[AI Error] Batch ${i}-${i+batchRows.length}:`, errMsg);
      batchRows.forEach((d, idx) => allSkipped.push({ rowIndex: i + idx, reason: `Processing error: ${errMsg}`, originalData: d }));
    }
  }

  return { records: allRecords, skipped: allSkipped };
}
