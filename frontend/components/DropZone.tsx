"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CloudArrowUpIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function DropZone({ onFileSelect, disabled }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.ms-excel": [".csv"] },
    multiple: false,
    disabled,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false),
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${
          isDragActive && !isDragReject
            ? "border-violet-500 bg-violet-500/10 scale-[1.02]"
            : isDragReject
            ? "border-red-500 bg-red-500/10"
            : "border-white/20 hover:border-violet-400 hover:bg-white/5 bg-white/[0.02]"
        }
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-4">
        <div
          className={`p-4 rounded-full transition-colors ${
            isDragActive && !isDragReject
              ? "bg-violet-500/20"
              : "bg-white/10"
          }`}
        >
          {isDragReject ? (
            <DocumentTextIcon className="w-10 h-10 text-red-400" />
          ) : (
            <CloudArrowUpIcon
              className={`w-10 h-10 ${
                isDragActive ? "text-violet-400" : "text-gray-400"
              }`}
            />
          )}
        </div>

        {isDragReject ? (
          <div>
            <p className="text-red-400 font-semibold text-lg">Only CSV files allowed</p>
            <p className="text-gray-500 text-sm mt-1">Please drop a .csv file</p>
          </div>
        ) : isDragActive ? (
          <div>
            <p className="text-violet-400 font-semibold text-lg">Drop it here</p>
            <p className="text-gray-400 text-sm mt-1">Release to upload your CSV</p>
          </div>
        ) : (
          <div>
            <p className="text-white font-semibold text-lg">
              Drag & drop your CSV here
            </p>
            <p className="text-gray-400 text-sm mt-1">
              or{" "}
              <span className="text-violet-400 underline underline-offset-2">
                click to browse
              </span>
            </p>
            <p className="text-gray-600 text-xs mt-3">
              Supports any CSV format — Facebook exports, Google Ads, CRM exports, spreadsheets
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
