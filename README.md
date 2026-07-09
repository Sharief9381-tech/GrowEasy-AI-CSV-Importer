# GrowEasy AI-Powered CSV Importer

An intelligent CSV importer that uses **Groq (Llama 3.3 70B)** to extract and map CRM lead data from any CSV format — Facebook exports, Google Ads, real estate CRMs, sales reports, or manually created spreadsheets.

## ✨ Features

- **Drag & Drop Upload** — Upload any CSV with any column names
- **Smart AI Mapping** — GPT-4o-mini intelligently maps arbitrary columns to CRM fields
- **Live Preview** — Inspect your CSV data before processing (horizontal + vertical scroll, sticky headers)
- **Batch Processing** — Handles large CSVs in batches with retry on failure
- **Results Dashboard** — View imported records, skipped records, and reasons for skipping
- **Status Badges** — Color-coded CRM status indicators
- **Dark Mode UI** — Beautiful dark theme with smooth animations
- **Responsive Design** — Works across desktop and mobile

## 🏗️ Architecture

```
groweasy_ai/
├── frontend/          # Next.js 15 + Tailwind CSS v4
│   ├── app/           # App Router pages
│   ├── components/    # React components
│   ├── lib/           # API client
│   └── types/         # TypeScript types
├── backend/           # Node.js + Express + TypeScript
│   └── src/
│       ├── routes/    # API route handlers
│       ├── services/  # AI + CSV services
│       └── types/     # Shared TypeScript types
├── samples/           # Sample CSV files for testing
└── docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- An **groq API key** ([platform.groq.com/api-keys](https://platform.groq.com/api-keys))

### 1. Clone & Install

```bash
git clone <repo-url>
cd groweasy_ai

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend** — create `backend/.env`:
```env
GROQ_API_KEY=your_GROQ_API_KEY_here
PORT=5000
FRONTEND_URL=http://localhost:3000
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
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App starts at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🐳 Docker Setup

```bash
# Copy and fill in your API key
cp backend/.env.example backend/.env
# Edit backend/.env with your GEMINI_API_KEY

# Build and run everything
GEMINI_API_KEY=your_key docker-compose up --build
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:5000](http://localhost:5000)

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/import/health` | Health check |
| `POST` | `/api/import/preview` | Upload CSV, get raw preview (no AI) |
| `POST` | `/api/import/process` | Upload CSV, run AI extraction |

### POST /api/import/preview

Returns parsed CSV headers and up to 200 rows for preview.

**Request:** `multipart/form-data` with `file` field (CSV)

**Response:**
```json
{
  "headers": ["Full Name", "Email Address", "Phone"],
  "rows": [{ "Full Name": "John", "Email Address": "john@example.com", ... }],
  "totalRows": 100,
  "previewRows": 100
}
```

### POST /api/import/process

Runs Gemini AI to extract CRM fields from the uploaded CSV.

**Request:** `multipart/form-data` with `file` field (CSV)

**Response:**
```json
{
  "success": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "mobile_without_country_code": "9876543210",
      "country_code": "+91",
      "crm_status": "GOOD_LEAD_FOLLOW_UP",
      ...
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

## 🤖 AI Behavior

The AI follows these rules when extracting records:

### CRM Status (must be exactly one of):
- `GOOD_LEAD_FOLLOW_UP`
- `DID_NOT_CONNECT`
- `BAD_LEAD`
- `SALE_DONE`

### Data Source (must be exactly one of, or empty):
- `leads_on_demand`
- `meridian_tower`
- `eden_park`
- `varah_swamy`
- `sarjapur_plots`

### Field Mapping Rules:
- "Phone", "Cell", "Contact No", "Mobile" → `mobile_without_country_code`
- "Email Address", "E-mail" → `email`
- Multiple emails: first used as primary, rest appended to `crm_note`
- Multiple phones: first used as primary, rest appended to `crm_note`
- Records with no email AND no mobile are **skipped**

## 🧪 Test CSV Samples

The `samples/` directory contains test files:

| File | Description |
|------|-------------|
| `real_estate_crm.csv` | Real estate CRM export with various column names |
| `facebook_leads.csv` | Facebook Lead Ads export format |
| `google_ads_export.csv` | Google Ads lead form export |

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS v4, TypeScript |
| Backend | Node.js, Express 4, TypeScript |
| AI | Groq (Llama 3.3 70B) |
| CSV Parsing | PapaParse |
| File Upload | Multer |
| Icons | Heroicons |

## 📁 CRM Fields

| Field | Description |
|-------|-------------|
| `created_at` | Lead creation date |
| `name` | Lead full name |
| `email` | Primary email |
| `country_code` | Country dialing code (e.g. +91) |
| `mobile_without_country_code` | Mobile digits only |
| `company` | Company name |
| `city` | City |
| `state` | State/Province |
| `country` | Country |
| `lead_owner` | Lead owner email/name |
| `crm_status` | Lead status (see allowed values) |
| `crm_note` | Notes, remarks, overflow contacts |
| `data_source` | Traffic source (see allowed values) |
| `possession_time` | Property possession time |
| `description` | Additional description |

## 🚢 Deployment

### Vercel (Frontend) + Railway (Backend)

**Backend on Railway:**
1. Connect your GitHub repo
2. Set root directory to `backend/`
3. Add environment variable: `GEMINI_API_KEY`

**Frontend on Vercel:**
1. Connect your GitHub repo
2. Set root directory to `frontend/`
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app`

---

Position applied for: **Software Developer Intern**

Built for GrowEasy assignment — [groweasy.ai](https://groweasy.ai)
