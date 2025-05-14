"use client";

interface StepperProps {
  currentStep: number;
  steps: string[];
}

export default function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="flex items-center justify-center w-full mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
                ${
                  index < currentStep
                    ? "bg-green-500 border-green-500 text-white"
                    : index === currentStep
                      ? "border-blue-500 text-blue-500"
                      : "border-gray-300 text-gray-300"
                }`}
          >
            {index < currentStep ? "✓" : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-20 h-1 mx-2 
                ${index < currentStep ? "bg-green-500" : "bg-gray-300"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
