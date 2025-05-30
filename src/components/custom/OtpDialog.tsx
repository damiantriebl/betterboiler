"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield } from "lucide-react";
import { useState } from "react";

interface OtpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (otp: string) => Promise<void>;
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
}

export function OtpDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Verificación de Seguridad",
  description = "Esta operación requiere verificación adicional. Por favor, ingresa tu código OTP.",
  isLoading = false,
  error,
}: OtpDialogProps) {
  const [otp, setOtp] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim()) {
      setLocalError("Por favor, ingresa el código OTP.");
      return;
    }

    if (otp.length !== 6) {
      setLocalError("El código OTP debe tener 6 dígitos.");
      return;
    }

    setLocalError("");

    try {
      await onConfirm(otp);
    } catch (error) {
      setLocalError("Error al validar el código OTP.");
    }
  };

  const handleClose = () => {
    setOtp("");
    setLocalError("");
    onOpenChange(false);
  };

  const handleOtpChange = (value: string) => {
    // Solo permitir números y máximo 6 dígitos
    const cleanValue = value.replace(/\D/g, "").slice(0, 6);
    setOtp(cleanValue);

    // Limpiar errores cuando el usuario empiece a escribir
    if (localError) {
      setLocalError("");
    }
  };

  const displayError = error || localError;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Código OTP</Label>
            <Input
              id="otp"
              type="text"
              placeholder="123456"
              value={otp}
              onChange={(e) => handleOtpChange(e.target.value)}
              className={`text-center text-lg tracking-widest ${displayError ? "border-red-500" : ""}`}
              disabled={isLoading}
              autoComplete="off"
              autoFocus
            />
            {displayError && <p className="text-sm text-red-500">{displayError}</p>}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Código de prueba:</strong> 123456
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !otp.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
