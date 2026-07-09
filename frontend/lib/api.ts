import { ParsedResult, PreviewData } from "@/types/crm";

// Use relative URL — proxied through Next.js to avoid CORS
const API_BASE = "/api";

export async function uploadForPreview(file: File): Promise<PreviewData> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/import/preview`, {
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

  const response = await fetch(`${API_BASE}/import/process`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Processing failed" }));
    throw new Error(err.error || "Failed to process file");
  }

  return response.json();
}
