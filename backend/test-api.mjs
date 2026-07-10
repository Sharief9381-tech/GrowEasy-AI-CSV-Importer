import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_FILE = path.join(__dirname, "../samples/facebook_leads.csv");

async function main() {
  const csvContent = fs.readFileSync(CSV_FILE);
  const form = new globalThis.FormData();
  form.set("file", new Blob([csvContent], { type: "text/csv" }), "facebook_leads.csv");

  console.log("Calling AI process...");
  const res = await fetch("http://localhost:5000/api/import/process", { method: "POST", body: form });
  const result = await res.json();

  if (result.error) {
    console.error("ERROR:", result.error);
  } else {
    console.log(`Imported: ${result.totalImported}, Skipped: ${result.totalSkipped}`);
    if (result.success?.length > 0) {
      console.log("\nFirst record:");
      console.log(JSON.stringify(result.success[0], null, 2));
    }
    if (result.skipped?.length > 0) {
      console.log("First skip:", result.skipped[0].reason.split("\n")[0]);
    }
  }
}

main().catch(console.error);
