"use client";

import { CheckIcon } from "@heroicons/react/24/solid";

interface Step {
  id: number;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 1, label: "Upload", description: "Choose your CSV" },
  { id: 2, label: "Preview", description: "Review the data" },
  { id: 3, label: "Import", description: "AI extraction" },
  { id: 4, label: "Results", description: "CRM records" },
];

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto">
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                  ${isCompleted
                    ? "bg-violet-600 text-white"
                    : isActive
                    ? "bg-violet-600/20 text-violet-400 border-2 border-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                    : "bg-white/5 text-gray-600 border border-white/10"
                  }
                `}
              >
                {isCompleted ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  step.id
                )}
              </div>
              <div className="text-center">
                <p
                  className={`text-xs font-medium ${
                    isActive ? "text-violet-400" : isCompleted ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 mb-5 transition-colors duration-500 ${
                  currentStep > step.id ? "bg-violet-600" : "bg-white/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
