import Groq from "groq-sdk";
import { CRMRecord, CRMStatus, DataSource, SkippedRecord, BatchResult } from "../types/crm";

const BATCH_SIZE = 20;
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
  return `You are a CRM data extraction expert. Map CSV data with arbitrary column names into GrowEasy CRM format.

## CRM Fields to Extract
- created_at: Lead creation date (parseable by JavaScript new Date())
- name: Lead full name
- email: Primary email address
- country_code: Country dialing code (e.g. +91, +1)
- mobile_without_country_code: Mobile digits only, no spaces/dashes/country code
- company: Company name
- city: City
- state: State or province
- country: Country
- lead_owner: Lead owner email or name
- crm_status: EXACTLY one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE
- crm_note: Remarks, notes, extra emails, extra phones, any overflow info
- data_source: EXACTLY one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots — or omit if none match
- possession_time: Property possession time
- description: Additional description

## Mapping Rules
1. crm_status: "Hot/Interested/Warm/Follow Up"→GOOD_LEAD_FOLLOW_UP | "Cold/No Answer/DNC"→DID_NOT_CONNECT | "Not Interested/Junk/Bad"→BAD_LEAD | "Closed/Won/Deal Done/Converted"→SALE_DONE | ambiguous→omit
2. data_source: match ad/campaign names to allowed values if confident, else omit
3. SKIP records with no email AND no mobile
4. Multiple emails → first primary, rest to crm_note
5. Multiple phones → first primary, rest to crm_note
6. mobile_without_country_code: digits only
7. Combine first+last name columns into name
8. Column mappings: Phone/Cell/Mobile/WhatsApp→mobile | Email Address/E-mail→email | Full Name/Prospect Name→name | Assigned To/Owner→lead_owner | Remarks/Comments/Notes→crm_note | Lead Stage/Status→crm_status | Entry Date/Created Time→created_at

## CSV Headers
${JSON.stringify(headers)}

## Records (${rows.length} rows, 0-indexed)
${JSON.stringify(rows, null, 2)}

## Output
Return ONLY valid JSON, no markdown:
{"results":[{"rowIndex":0,"action":"import","record":{"name":"...","email":"...","mobile_without_country_code":"...","country_code":"...","company":"...","city":"...","state":"...","country":"...","lead_owner":"...","crm_status":"...","crm_note":"...","data_source":"...","created_at":"...","possession_time":"...","description":"..."}},{"rowIndex":1,"action":"skip","reason":"No email or mobile number found"}]}`;
}

async function callGroqWithRetry(prompt: string, retries: number = 0): Promise<string> {
  try {
    const response = await getClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",
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
