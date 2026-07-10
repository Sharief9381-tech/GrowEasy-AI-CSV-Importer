"use client";

interface ProgressBarProps {
  message?: string;
}

export default function ProgressBar({ message }: ProgressBarProps) {
  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          {message || "Processing with AI..."}
        </span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 rounded-full animate-progress-indeterminate" />
      </div>
      <p className="text-xs text-gray-600">
        AI is intelligently mapping your CSV fields to CRM format — powered by Mistral AI.
      </p>
    </div>
  );
}
