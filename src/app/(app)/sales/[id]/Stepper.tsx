"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepperProps {
  currentStep: number;
  steps: string[];
}

export default function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {/* Línea antes del círculo (excepto para el primer paso) */}
              {index > 0 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 transition-colors duration-300",
                    index <= currentStep ? "bg-primary" : "bg-muted",
                  )}
                />
              )}

              {/* Círculo del paso */}
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 mx-2",
                  {
                    "bg-primary border-primary text-primary-foreground": index < currentStep,
                    "border-primary text-primary bg-background": index === currentStep,
                    "border-muted-foreground text-muted-foreground bg-background":
                      index > currentStep,
                  },
                )}
              >
                {index < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Línea después del círculo (excepto para el último paso) */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 transition-colors duration-300",
                    index < currentStep ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>

            {/* Texto del paso */}
            <div className="mt-3 text-center max-w-[120px]">
              <p
                className={cn("text-sm font-medium transition-colors duration-300", {
                  "text-primary": index <= currentStep,
                  "text-muted-foreground": index > currentStep,
                })}
              >
                {step}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
