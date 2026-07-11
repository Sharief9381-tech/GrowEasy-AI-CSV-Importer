# GrowEasy AI-Powered CSV Importer

An intelligent CSV importer that uses **Mistral AI** to extract and map CRM lead data from any CSV format — Facebook exports, Google Ads, real estate CRMs, sales reports, or manually created spreadsheets.

🔗 **Live Demo:** https://ai-csv-importer-mu.vercel.app  
📦 **GitHub:** https://github.com/Sharief9381-tech/GrowEasy-AI-CSV-Importer

---

## Screenshots

### Step 1 — Upload CSV (Drag & Drop)
Upload any CSV file by dragging & dropping or clicking to browse. Supports any column structure.

### Step 2 — Preview Data
Instantly see your CSV data in a responsive table with sticky headers and horizontal scrolling. No AI processing yet.

### Step 3 — AI Processing
Mistral AI analyzes column headers and intelligently maps each row to GrowEasy CRM fields with a live progress indicator.

### Step 4 — Results
View imported records with color-coded CRM status badges, skipped records with reasons, and export to CSV in GrowEasy format.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS v4, TypeScript |
| Backend | Node.js, Express 4, TypeScript |
| AI | Mistral AI (`mistral-small-latest`) |
| CSV Parsing | PapaParse |
| File Upload | Multer (memory storage) |
| Icons | Heroicons |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                     │
│  Step 1: Upload → Step 2: Preview → Step 3: AI → Step 4 │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / SSE
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Express Backend (Node.js)                   │
│                                                          │
│  POST /api/import/preview  ─── PapaParse CSV             │
│  POST /api/import/process  ─── PapaParse + Mistral AI   │
│  POST /api/import/process-stream ── SSE streaming        │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS API
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Mistral AI (mistral-small-latest)           │
│  Input: CSV headers + rows (batches of 15)               │
│  Output: Structured JSON with CRM field mappings         │
└─────────────────────────────────────────────────────────┘
```

### Data Flow
1. User uploads CSV → backend parses with PapaParse
2. Preview returned to frontend (no AI yet)
3. User confirms → backend sends rows to Mistral AI in **batches of 15**
4. AI returns structured JSON → backend sanitizes and validates
5. Results streamed back to frontend via SSE with live progress %

---

## AI Prompt Engineering

The AI prompt is carefully engineered to handle messy, real-world CSV data:

### Prompt Strategy
- **Role priming:** "You are a CRM data extraction expert" sets the context
- **Explicit field definitions:** Each CRM field is described with examples
- **Strict constraint rules:** crm_status and data_source must be exact enum values
- **Intelligent column mapping rules:** e.g. "Phone/Cell/Mobile/WhatsApp → mobile_without_country_code"
- **Edge case handling:** Multiple emails, multiple phones, combined first+last name
- **JSON-only output:** `responseFormat: { type: "json_object" }` enforces valid JSON

### Field Mapping Intelligence
```
"Phone" / "Cell" / "WhatsApp" / "Contact No"  →  mobile_without_country_code
"Email Address" / "E-mail" / "Primary Email"  →  email
"Full Name" / "Prospect Name" / "Contact"     →  name (first+last combined)
"Lead Stage" / "Status"                       →  crm_status
"Remarks" / "Comments" / "Notes"              →  crm_note
"Entry Date" / "Created Time"                 →  created_at
"Assigned To" / "Owner" / "Agent"             →  lead_owner
```

### CRM Status Mapping
| Raw CSV Value | Mapped To |
|--------------|-----------|
| Hot / Warm / Interested / Follow-up | `GOOD_LEAD_FOLLOW_UP` |
| Cold / No answer / DNC / Busy | `DID_NOT_CONNECT` |
| Not interested / Junk / Wrong number | `BAD_LEAD` |
| Closed / Won / Deal done / Converted | `SALE_DONE` |

### Data Source Mapping
Only mapped if confidently matched: `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots`

### Skip Logic
Records with **no email AND no mobile** are automatically skipped with a reason.

### Post-Processing Sanitization
After AI response, the backend sanitizes every record:
- `mobile_without_country_code`: strips all non-digits
- `email`: lowercased and trimmed
- `crm_status`: validated against allowed enum values
- `created_at`: validated with `new Date()` — invalid dates discarded

---

## API Documentation

### Base URL
```
https://groweasy-ai-csv-importer-jnaj.onrender.com
```

---

### GET /api/import/health
Health check endpoint.

**Response:**
```json
{ "status": "ok", "timestamp": "2026-07-11T00:00:00.000Z" }
```

---

### POST /api/import/preview
Parse CSV and return raw data for preview. **No AI processing.**

**Request:** `multipart/form-data` with `file` field (CSV)

**Response:**
```json
{
  "headers": ["Full Name", "Email Address", "Phone", "City"],
  "rows": [
    { "Full Name": "John Doe", "Email Address": "john@example.com", ... }
  ],
  "totalRows": 100,
  "previewRows": 100
}
```

---

### POST /api/import/process
Upload CSV and run AI extraction. Returns complete results.

**Request:** `multipart/form-data` with `file` field (CSV)

**Response:**
```json
{
  "success": [
    {
      "created_at": "2026-06-01T10:30:00.000Z",
      "name": "John Doe",
      "email": "john@example.com",
      "country_code": "+91",
      "mobile_without_country_code": "9876543210",
      "company": "Acme Corp",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "lead_owner": "agent@groweasy.ai",
      "crm_status": "GOOD_LEAD_FOLLOW_UP",
      "crm_note": "Follow up next week",
      "data_source": "sarjapur_plots"
    }
  ],
  "skipped": [
    {
      "rowIndex": 4,
      "reason": "No email or mobile number found",
      "originalData": { ... }
    }
  ],
  "totalImported": 5,
  "totalSkipped": 1
}
```

---

### POST /api/import/process-stream
Same as `/process` but streams progress via **Server-Sent Events (SSE)**.

**Events:**
```
event: start
data: { "totalRows": 50 }

event: progress
data: { "processed": 15, "total": 50, "percent": 30 }

event: complete
data: { "success": [...], "skipped": [...], "totalImported": 45, "totalSkipped": 5 }

event: error
data: { "message": "Error description" }
```

---

## CRM Fields Reference

| Field | Description | Example |
|-------|-------------|---------|
| `created_at` | Lead creation date (JS parseable) | `2026-06-01T10:30:00.000Z` |
| `name` | Lead full name | `John Doe` |
| `email` | Primary email | `john@example.com` |
| `country_code` | Dialing code | `+91` |
| `mobile_without_country_code` | Digits only | `9876543210` |
| `company` | Company name | `Acme Corp` |
| `city` | City | `Mumbai` |
| `state` | State/Province | `Maharashtra` |
| `country` | Country | `India` |
| `lead_owner` | Owner email/name | `agent@groweasy.ai` |
| `crm_status` | Lead status (enum) | `GOOD_LEAD_FOLLOW_UP` |
| `crm_note` | Notes + overflow data | `Follow up Monday` |
| `data_source` | Traffic source (enum) | `sarjapur_plots` |
| `possession_time` | Property possession | `Q3 2026` |
| `description` | Additional info | `Interested in 3BHK` |

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- Mistral AI API key — free at [console.mistral.ai](https://console.mistral.ai)

### 1. Clone & Install

```bash
git clone https://github.com/Sharief9381-tech/GrowEasy-AI-CSV-Importer.git
cd GrowEasy-AI-CSV-Importer

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Environment Variables

**Backend** — create `backend/.env`:
```env
MISTRAL_API_KEY=your_mistral_api_key_here
PORT=5000
```

**Frontend** — create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Run Development Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Runs at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Runs at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000)

---

## Docker Setup

```bash
# Add your Mistral API key to backend/.env first
MISTRAL_API_KEY=your_key docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## Deployment

### Backend → Render
1. New Web Service → connect GitHub repo
2. Root Directory: `backend`
3. Build Command: `npm install && npm run build`
4. Start Command: `node dist/index.js`
5. Environment variable: `MISTRAL_API_KEY`

### Frontend → Vercel
1. New Project → connect GitHub repo
2. Root Directory: `frontend`
3. Environment variable: `NEXT_PUBLIC_API_URL` = your Render URL

---

## Sample CSV Files

The `samples/` directory contains test files:

| File | Description | Rows |
|------|-------------|------|
| `real_estate_crm.csv` | Real estate CRM with complex columns | 6 |
| `facebook_leads.csv` | Facebook Lead Ads export format | 6 |
| `google_ads_export.csv` | Google Ads lead form export | 5 |

---

## Bonus Features Implemented

- ✅ Drag & Drop upload
- ✅ Live progress indicator with % during AI processing
- ✅ SSE streaming for incremental results
- ✅ Retry mechanism on transient errors
- ✅ Dark mode UI
- ✅ Docker setup
- ✅ Deployed on Vercel + Render
- ✅ Export results to CSV in GrowEasy format
- ✅ Sticky headers + horizontal scroll for wide CSVs
- ✅ Error handling with user-friendly messages
- ✅ Responsive mobile layout

---

## Position Applied For

**Software Developer Intern**

Built for GrowEasy · [groweasy.ai](https://groweasy.ai)
