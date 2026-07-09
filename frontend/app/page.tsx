"use client";

import { useState, useCallback } from "react";
import DropZone from "@/components/DropZone";
import PreviewTable from "@/components/PreviewTable";
import ResultsTable from "@/components/ResultsTable";
import ProgressBar from "@/components/ProgressBar";
import StepIndicator from "@/components/StepIndicator";
import { uploadForPreview, processCSV } from "@/lib/api";
import { PreviewData, ParsedResult } from "@/types/crm";
import {
  ArrowPathIcon,
  SparklesIcon,
  DocumentArrowUpIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

type Step = 1 | 2 | 3 | 4;

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);
    setLoading(true);
    setLoadingMessage("Parsing CSV file...");

    try {
      const data = await uploadForPreview(selectedFile);
      setPreview(data);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read CSV");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  }, []);

  const handleConfirmImport = async () => {
    if (!file) return;
    setError(null);
    setLoading(true);
    setStep(3);
    setLoadingMessage("Sending to AI for intelligent field mapping...");

    try {
      const data = await processCSV(file);
      setResult(data);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI processing failed");
      setStep(2);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Gradient orbs for visual depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-600/15 border border-violet-500/20 text-violet-400 text-xs font-medium mb-4">
            <SparklesIcon className="w-3.5 h-3.5" />
            Powered by Groq · Llama 3.3 70B
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent mb-3">
            GrowEasy CSV Importer
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Upload any CSV format. AI intelligently maps your data to CRM fields — no manual column matching needed.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-10">
          <StepIndicator currentStep={step} />
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Something went wrong</p>
              <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm shadow-2xl overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step === 1 && (
                <>
                  <DocumentArrowUpIcon className="w-5 h-5 text-violet-400" />
                  <span className="font-semibold text-white">Upload CSV</span>
                  <span className="text-gray-500 text-sm">— Step 1 of 4</span>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="w-5 h-5 text-violet-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                    </svg>
                  </div>
                  <span className="font-semibold text-white">Preview Data</span>
                  <span className="text-gray-500 text-sm">— Step 2 of 4</span>
                </>
              )}
              {step === 3 && (
                <>
                  <SparklesIcon className="w-5 h-5 text-violet-400 animate-pulse" />
                  <span className="font-semibold text-white">AI Processing</span>
                  <span className="text-gray-500 text-sm">— Step 3 of 4</span>
                </>
              )}
              {step === 4 && (
                <>
                  <CheckIcon className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-white">Import Complete</span>
                  <span className="text-gray-500 text-sm">— Step 4 of 4</span>
                </>
              )}
            </div>

            {(step === 2 || step === 4) && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Start over
              </button>
            )}
          </div>

          {/* Card Body */}
          <div className="p-6">
            {/* STEP 1: Upload */}
            {step === 1 && (
              <div className="space-y-4">
                <DropZone onFileSelect={handleFileSelect} disabled={loading} />
                {loading && <ProgressBar message={loadingMessage} />}

                {/* Supported formats */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    "Facebook Lead Ads",
                    "Google Ads",
                    "Excel Exports",
                    "Real Estate CRMs",
                    "Sales Reports",
                    "Any CSV Format",
                  ].map((label) => (
                    <span
                      key={label}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Preview */}
            {step === 2 && preview && (
              <div className="space-y-5">
                {/* File info */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-600/10 border border-violet-500/20">
                  <DocumentArrowUpIcon className="w-5 h-5 text-violet-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file?.name}</p>
                    <p className="text-xs text-gray-400">
                      {(file?.size ? (file.size / 1024).toFixed(1) : "?")} KB
                      <span className="mx-1.5">·</span>
                      {preview.totalRows} rows
                      <span className="mx-1.5">·</span>
                      {preview.headers.length} columns
                    </p>
                  </div>
                </div>

                <PreviewTable
                  headers={preview.headers}
                  rows={preview.rows}
                  totalRows={preview.totalRows}
                  previewRows={preview.previewRows}
                />

                {/* Confirm button */}
                <div className="flex items-center gap-4 pt-2">
                  <button
                    onClick={handleConfirmImport}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-violet-600/25 hover:shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    Confirm & Run AI Import
                  </button>
                  <p className="text-xs text-gray-500">
                    AI will intelligently extract CRM fields from your data
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: Processing */}
            {step === 3 && (
              <div className="py-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30 mb-2">
                    <SparklesIcon className="w-8 h-8 text-violet-400 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    AI is mapping your CSV
                  </h3>
                  <p className="text-gray-400 text-sm max-w-md mx-auto">
                    Llama 3.3 70B is analyzing your column headers and intelligently mapping each row to GrowEasy CRM fields.
                  </p>
                </div>
                <div className="max-w-md mx-auto">
                  <ProgressBar message={loadingMessage} />
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-600">
                  {[
                    "Analyzing column headers",
                    "Mapping fields with AI",
                    "Validating records",
                    "Extracting CRM data",
                  ].map((step) => (
                    <span
                      key={step}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full"
                    >
                      <span className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Results */}
            {step === 4 && result && (
              <ResultsTable
                success={result.success}
                skipped={result.skipped}
                totalImported={result.totalImported}
                totalSkipped={result.totalSkipped}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-8">
          Built for GrowEasy · Supports any CSV format · Powered by Groq (Llama 3.3 70B)
        </p>
      </div>
    </div>
  );
}
