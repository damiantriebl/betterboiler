// app/current-accounts/components/AnnulPaymentButton.tsx
"use client";

import { type UndoPaymentFormState, undoPayment } from "@/actions/current-accounts/undo-payment";
import { OtpDialog } from "@/components/custom/OtpDialog";
import { Button } from "@/components/ui/button";
import { useSecurityStore } from "@/stores/security-store";
import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

interface AnnulPaymentButtonProps {
  paymentId: string;
  onAnnulmentSuccess?: (paymentId: string) => void;
  buttonText?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | null
    | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
}

const initialUndoState: UndoPaymentFormState = {
  message: "",
  success: false,
};

export default function AnnulPaymentButton({
  paymentId,
  onAnnulmentSuccess,
  buttonText = "Anular Pago",
  variant = "outline",
  size = "sm",
  className,
}: AnnulPaymentButtonProps) {
  const [state, formAction, isPending] = useActionState(undoPayment, initialUndoState);
  const formRef = useRef<HTMLFormElement>(null);
  const [hasBeenProcessed, setHasBeenProcessed] = useState(false);

  // Estados para OTP y seguridad
  const { secureMode } = useSecurityStore();
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    if (state.success && !isPending && !hasBeenProcessed) {
      setHasBeenProcessed(true);
      if (onAnnulmentSuccess) {
        onAnnulmentSuccess(paymentId);
      }
    }
    if (paymentId) {
      setHasBeenProcessed(false);
    }
    if (state.message && !state.success) {
      setHasBeenProcessed(false);

      // Si se requiere OTP, mostrar el modal
      if (state.requiresOtp) {
        setShowOtpDialog(true);
        setOtpError(state.message);
      }
    }
  }, [state, isPending, onAnnulmentSuccess, paymentId, hasBeenProcessed]);

  // Función para manejar el click del botón
  const handleButtonClick = (e: React.FormEvent) => {
    if (secureMode && !showOtpDialog) {
      // En modo seguro, verificar si necesitamos OTP primero
      e.preventDefault();
      setShowOtpDialog(true);
      setOtpError("");
    }
    // Si no es modo seguro, dejar que el form se envíe normalmente
  };

  // Función para confirmar OTP
  const handleOtpConfirm = async (otp: string) => {
    setOtpLoading(true);
    setOtpError("");

    try {
      // Crear FormData con el OTP
      const formData = new FormData();
      formData.append("paymentId", paymentId);
      formData.append("otp", otp);
      formData.append("secureMode", "true");

      // Ejecutar la acción con OTP
      const result = await undoPayment(initialUndoState, formData);

      if (result.success) {
        setShowOtpDialog(false);
        setHasBeenProcessed(true);
        if (onAnnulmentSuccess) {
          onAnnulmentSuccess(paymentId);
        }
      } else {
        setOtpError(result.message);
      }
    } catch (error) {
      setOtpError("Error al validar el código OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  if (state.message && hasBeenProcessed && state.success) {
    return (
      <div className="flex flex-col items-start text-sm">
        <p className="text-blue-600">{state.message} (Actualizando...)</p>
      </div>
    );
  }

  if (state.message && !state.success && !state.requiresOtp) {
    return (
      <div className="flex flex-col items-start text-sm">
        <form
          action={formAction}
          ref={formRef}
          className="inline-block"
          onSubmit={handleButtonClick}
        >
          <input type="hidden" name="paymentId" value={paymentId} />
          <input type="hidden" name="secureMode" value={secureMode.toString()} />
          <Button
            type="submit"
            variant={variant}
            size={size}
            disabled={isPending}
            className={className}
          >
            {isPending ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                <span>Anulando...</span>
              </>
            ) : (
              <span>{buttonText}</span>
            )}
          </Button>
        </form>
        <p className="text-red-600 mt-1">{state.message}</p>
      </div>
    );
  }

  return (
    <>
      <form action={formAction} ref={formRef} className="inline-block" onSubmit={handleButtonClick}>
        <input type="hidden" name="paymentId" value={paymentId} />
        <input type="hidden" name="secureMode" value={secureMode.toString()} />
        <Button
          type="submit"
          variant={variant}
          size={size}
          disabled={isPending || hasBeenProcessed}
          className={className}
        >
          {isPending ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              <span>Anulando...</span>
            </>
          ) : (
            <span>{buttonText}</span>
          )}
        </Button>
      </form>

      <OtpDialog
        open={showOtpDialog}
        onOpenChange={(open) => {
          setShowOtpDialog(open);
          if (!open) {
            setOtpError("");
          }
        }}
        onConfirm={handleOtpConfirm}
        title="Verificación de Seguridad - Anulación de Pago"
        description="Estás a punto de anular un pago. Esta es una operación crítica que requiere verificación adicional."
        isLoading={otpLoading}
        error={otpError}
      />
    </>
  );
}
