"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const OTP_VALIDITY_SECONDS = 120; // 2 minutos

interface OtpConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (otpToken: string) => Promise<void>; // Hacerla async para manejar isSubmitting
  isSubmitting: boolean; // Para deshabilitar el botón mientras se procesa
  itemName?: string; // Nombre del item a eliminar, para el mensaje
}

export default function OtpConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  itemName = "el elemento seleccionado",
}: OtpConfirmationModalProps) {
  const [otpToken, setOtpToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(OTP_VALIDITY_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOtpToken(""); // Limpiar token anterior
      setTimeLeft(OTP_VALIDITY_SECONDS); // Reiniciar contador
      // Iniciar contador
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      // Cleanup en desmontaje o cuando isOpen cambie
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOpen]);

  const handleConfirmClick = async () => {
    if (otpToken.length === 6 && timeLeft > 0) {
      await onConfirm(otpToken);
      // El cierre del modal y reset se manejan en la lógica del componente padre
      // después de que onConfirm resuelva, para permitir manejo de errores.
    }
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmación OTP Requerida</DialogTitle>
          <DialogDescription>
            Para eliminar {itemName}, por favor ingrese el código de un solo uso generado por su
            aplicación de autenticación.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <InputOTP
            maxLength={6}
            value={otpToken}
            onChange={(value) => setOtpToken(value.replace(/\D/g, ""))}
            disabled={isSubmitting || timeLeft === 0}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {timeLeft > 0 ? (
            <p className="text-sm text-muted-foreground">
              Tiempo restante: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
            </p>
          ) : (
            <p className="text-sm text-destructive">
              El tiempo para ingresar el código ha expirado. Por favor, cierre e intente de nuevo
              con un nuevo código.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleConfirmClick}
            disabled={isSubmitting || otpToken.length !== 6 || timeLeft === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Borrado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
