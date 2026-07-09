"use client";

interface PreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  previewRows: number;
}

export default function PreviewTable({
  headers,
  rows,
  totalRows,
  previewRows,
}: PreviewTableProps) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
      {/* Table info bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            <span className="text-white font-medium">{headers.length}</span> columns
          </span>
          <span className="text-gray-600">·</span>
          <span className="text-sm text-gray-400">
            <span className="text-white font-medium">{totalRows}</span> rows
            {previewRows < totalRows && (
              <span className="text-yellow-400 ml-1">
                (showing first {previewRows})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400">Ready to import</span>
        </div>
      </div>

      {/* Scrollable table */}
      <div className="overflow-auto max-h-[420px]">
        <table className="w-full text-sm border-collapse min-w-max">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-[#1a1a2e] border-b border-r border-white/10 px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                #
              </th>
              {headers.map((header) => (
                <th
                  key={header}
                  className="sticky top-0 z-10 bg-[#1a1a2e] border-b border-white/10 px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                <td className="sticky left-0 bg-[#0f0f1a] hover:bg-[#161628] border-r border-white/10 px-4 py-2.5 text-gray-600 text-xs font-mono whitespace-nowrap">
                  {idx + 1}
                </td>
                {headers.map((header) => (
                  <td
                    key={header}
                    className="px-4 py-2.5 text-gray-300 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis"
                    title={row[header]}
                  >
                    {row[header] || (
                      <span className="text-gray-600 italic text-xs">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
