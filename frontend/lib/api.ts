import { ParsedResult, PreviewData } from "@/types/crm";

// Direct call to backend — CORS is open
const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000")
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

export async function uploadForPreview(file: File): Promise<PreviewData> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/import/preview`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Failed to upload file");
  }

  return response.json();
}

export async function processCSV(file: File): Promise<ParsedResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/import/process`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Processing failed" }));
    throw new Error(err.error || "Failed to process file");
  }

  return response.json();
}
