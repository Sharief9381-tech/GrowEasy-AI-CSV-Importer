"use client";

import { useState } from "react";
import { CRMRecord, SkippedRecord } from "@/types/crm";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface ResultsTableProps {
  success: CRMRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
}

const CRM_FIELDS: { key: keyof CRMRecord; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "mobile_without_country_code", label: "Mobile" },
  { key: "country_code", label: "Code" },
  { key: "company", label: "Company" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "crm_status", label: "Status" },
  { key: "lead_owner", label: "Lead Owner" },
  { key: "data_source", label: "Source" },
  { key: "created_at", label: "Created At" },
  { key: "crm_note", label: "Notes" },
  { key: "description", label: "Description" },
  { key: "possession_time", label: "Possession" },
];

const STATUS_COLORS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  DID_NOT_CONNECT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BAD_LEAD: "bg-red-500/20 text-red-400 border-red-500/30",
  SALE_DONE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function ResultsTable({
  success,
  skipped,
  totalImported,
  totalSkipped,
}: ResultsTableProps) {
  const [activeTab, setActiveTab] = useState<"success" | "skipped">("success");

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-4">
          <CheckCircleIcon className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-emerald-400">{totalImported}</p>
            <p className="text-sm text-gray-400">Records imported</p>
          </div>
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-4">
          <XCircleIcon className="w-8 h-8 text-red-400 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-red-400">{totalSkipped}</p>
            <p className="text-sm text-gray-400">Records skipped</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("success")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "success"
              ? "bg-violet-600 text-white shadow"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Imported ({totalImported})
        </button>
        {totalSkipped > 0 && (
          <button
            onClick={() => setActiveTab("skipped")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "skipped"
                ? "bg-red-600 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Skipped ({totalSkipped})
          </button>
        )}
      </div>

      {/* Success Table */}
      {activeTab === "success" && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {success.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No records were successfully imported.
            </div>
          ) : (
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-sm border-collapse min-w-max">
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-20 bg-[#1a1a2e] border-b border-r border-white/10 px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      #
                    </th>
                    {CRM_FIELDS.map((f) => (
                      <th
                        key={f.key}
                        className="sticky top-0 z-10 bg-[#1a1a2e] border-b border-white/10 px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                      >
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {success.map((record, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <td className="sticky left-0 bg-[#0f0f1a] hover:bg-[#161628] border-r border-white/10 px-4 py-2.5 text-gray-600 text-xs font-mono">
                        {idx + 1}
                      </td>
                      {CRM_FIELDS.map((f) => (
                        <td
                          key={f.key}
                          className="px-4 py-2.5 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis"
                          title={String(record[f.key] ?? "")}
                        >
                          {f.key === "crm_status" && record.crm_status ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                                STATUS_COLORS[record.crm_status] ||
                                "bg-gray-500/20 text-gray-400"
                              }`}
                            >
                              {record.crm_status}
                            </span>
                          ) : record[f.key] ? (
                            <span className="text-gray-300">
                              {String(record[f.key])}
                            </span>
                          ) : (
                            <span className="text-gray-700 italic text-xs">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Skipped Table */}
      {activeTab === "skipped" && (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {skipped.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No records were skipped.
            </div>
          ) : (
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="sticky top-0 bg-[#1a1a2e] border-b border-white/10 px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Row
                    </th>
                    <th className="sticky top-0 bg-[#1a1a2e] border-b border-white/10 px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="sticky top-0 bg-[#1a1a2e] border-b border-white/10 px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Original Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {skipped.map((record, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                        {record.rowIndex + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-red-400 text-xs px-2 py-1 bg-red-500/10 rounded-md">
                          {record.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[400px]">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(record.originalData)
                            .filter(([, v]) => v)
                            .slice(0, 5)
                            .map(([k, v]) => (
                              <span
                                key={k}
                                className="px-1.5 py-0.5 bg-white/5 rounded text-gray-500"
                                title={`${k}: ${v}`}
                              >
                                <span className="text-gray-600">{k}:</span>{" "}
                                {String(v).substring(0, 30)}
                                {String(v).length > 30 ? "…" : ""}
                              </span>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
