import { ParsedResult, PreviewData } from "@/types/crm";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

export async function processCSV(
  file: File,
  onProgress?: (processed: number, total: number, percent: number) => void
): Promise<ParsedResult> {
  const formData = new FormData();
  formData.append("file", file);

  // Use streaming endpoint if progress callback provided
  if (onProgress) {
    return processCSVWithStream(formData, onProgress);
  }

  // No timeout — wait as long as it takes
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

async function processCSVWithStream(
  formData: FormData,
  onProgress: (processed: number, total: number, percent: number) => void
): Promise<ParsedResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/import/process-stream`);
    xhr.timeout = 0; // no timeout

    let buffer = "";

    xhr.onprogress = () => {
      const newData = xhr.responseText.slice(buffer.length);
      buffer = xhr.responseText;

      const lines = newData.split("\n");
      let currentEvent = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === "progress") {
              onProgress(data.processed, data.total, data.percent);
            } else if (currentEvent === "complete") {
              resolve(data);
            } else if (currentEvent === "error") {
              reject(new Error(data.message || "Processing failed"));
            }
          } catch {
            // ignore parse errors in stream
          }
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error during processing"));
    xhr.ontimeout = () => reject(new Error("Request timed out"));
    xhr.send(formData);
  });
}
