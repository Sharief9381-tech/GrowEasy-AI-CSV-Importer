import Groq from "groq-sdk";
import { CRMRecord, CRMStatus, DataSource, SkippedRecord, BatchResult } from "../types/crm";

const BATCH_SIZE = 15;
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
  return `You are a CRM data extraction expert. Extract GrowEasy CRM fields from these CSV rows.

CRM FIELDS: created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description

STRICT RULES:
1. crm_status MUST be one of: GOOD_LEAD_FOLLOW_UP | DID_NOT_CONNECT | BAD_LEAD | SALE_DONE
   - Hot/Warm/Interested/Follow-up/Callback → GOOD_LEAD_FOLLOW_UP
   - Cold/No answer/DNC/Busy/Not picking → DID_NOT_CONNECT  
   - Not interested/Junk/Wrong number/Invalid → BAD_LEAD
   - Closed/Won/Deal done/Sale done/Converted/Onboarded → SALE_DONE
2. data_source MUST be one of: leads_on_demand | meridian_tower | eden_park | varah_swamy | sarjapur_plots (omit if none match)
3. SKIP row if NO email AND NO mobile — set action:"skip"
4. mobile_without_country_code: digits only, no +, no spaces, no dashes
5. Multiple emails → first to email, rest append to crm_note
6. Multiple phones → first to mobile, rest append to crm_note
7. created_at: ISO format parseable by new Date()
8. Merge first_name + last_name into name
9. Map intelligently: "Phone"/"Cell"/"WhatsApp"→mobile, "E-mail"/"Email Address"→email, "Prospect"/"Contact"→name, "Stage"/"Status"→crm_status, "Remarks"/"Comments"→crm_note, "Owner"/"Assigned"→lead_owner

HEADERS: ${JSON.stringify(headers)}
ROWS (${rows.length} records, 0-indexed): ${JSON.stringify(rows)}

OUTPUT — valid JSON only, no markdown:
{"results":[{"rowIndex":0,"action":"import","record":{"name":"...","email":"...","mobile_without_country_code":"...","country_code":"...","company":"...","city":"...","state":"...","country":"...","lead_owner":"...","crm_status":"GOOD_LEAD_FOLLOW_UP","crm_note":"...","data_source":"...","created_at":"...","possession_time":"...","description":"..."}},{"rowIndex":1,"action":"skip","reason":"No email or mobile"}]}`;
}

async function callGroqWithRetry(prompt: string, retries: number = 0): Promise<string> {
  try {
    const response = await getClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a CRM data extraction assistant. Always respond with valid JSON only. Never include markdown or explanations.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });
    return response.choices[0]?.message?.content || "{}";
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    // On rate limit, wait the suggested retry time
    if (msg.includes("429") || msg.includes("rate_limit")) {
      const retryMatch = msg.match(/try again in (\d+)m/);
      const waitMs = retryMatch ? parseInt(retryMatch[1]) * 60 * 1000 + 5000 : 60000;
      if (retries < MAX_RETRIES) {
        console.log(`[Rate limit] Waiting ${Math.round(waitMs/1000)}s before retry ${retries + 1}...`);
        await new Promise((r) => setTimeout(r, waitMs));
        return callGroqWithRetry(prompt, retries + 1);
      }
    } else if (retries < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, Math.pow(2, retries) * 2000));
      return callGroqWithRetry(prompt, retries + 1);
    }
    throw error;
  }
}

function sanitizeRecord(record: Partial<CRMRecord>): CRMRecord {
  const s: CRMRecord = {};
  if (record.created_at) {
    const d = new Date(record.created_at);
    if (!isNaN(d.getTime())) s.created_at = record.created_at;
  }
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
  if (record.crm_status && ALLOWED_CRM_STATUSES.includes(record.crm_status)) {
    s.crm_status = record.crm_status;
  }
  if (record.crm_note) s.crm_note = String(record.crm_note).trim();
  if (record.data_source && ALLOWED_DATA_SOURCES.includes(record.data_source as DataSource)) {
    s.data_source = record.data_source as DataSource;
  }
  if (record.possession_time) s.possession_time = String(record.possession_time).trim();
  if (record.description) s.description = String(record.description).trim();
  return s;
}

export async function processCSVWithAI(
  headers: string[],
  rows: Record<string, string>[],
  onProgress?: (processed: number, total: number) => void
): Promise<BatchResult> {
  const allRecords: CRMRecord[] = [];
  const allSkipped: SkippedRecord[] = [];
  const total = rows.length;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batchRows = rows.slice(i, i + BATCH_SIZE);

    try {
      const raw = await callGroqWithRetry(buildPrompt(headers, batchRows));

      let parsed: {
        results: Array<{
          rowIndex: number;
          action: "import" | "skip";
          record?: Partial<CRMRecord>;
          reason?: string;
        }>;
      };

      try {
        parsed = JSON.parse(raw);
      } catch {
        batchRows.forEach((d, idx) => {
          allSkipped.push({ rowIndex: i + idx, reason: "AI returned invalid JSON", originalData: d });
        });
        continue;
      }

      for (const item of parsed.results) {
        const globalIdx = i + item.rowIndex;
        const orig = batchRows[item.rowIndex] || {};

        if (item.action === "import" && item.record) {
          const rec = sanitizeRecord(item.record);
          if (!rec.email && !rec.mobile_without_country_code) {
            allSkipped.push({ rowIndex: globalIdx, reason: "No valid email or mobile after processing", originalData: orig });
          } else {
            allRecords.push(rec);
          }
        } else {
          allSkipped.push({ rowIndex: globalIdx, reason: item.reason || "Skipped by AI", originalData: orig });
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[AI Error] Batch ${i}-${i + batchRows.length}:`, errMsg.slice(0, 200));
      batchRows.forEach((d, idx) => {
        allSkipped.push({ rowIndex: i + idx, reason: `Processing error: ${errMsg.slice(0, 100)}`, originalData: d });
      });
    }

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, total), total);
    }
  }

  return { records: allRecords, skipped: allSkipped };
}
