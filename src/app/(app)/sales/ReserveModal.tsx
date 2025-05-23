"use client";

import { getAllPaymentMethods } from "@/actions/payment-methods/get-payment-methods";
import { createReservation } from "@/actions/sales/create-reservation"; // Will be used for non-current-account for now
import type { Client, CurrentAccount } from "@prisma/client";
import type { PaymentMethod } from "@/types/payment-methods";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { CurrentAccountPaymentForm } from "./components/CurrentAccountPaymentForm";

interface SaleModalProps {
  open: boolean;
  onClose: () => void;
  motorcycleId: number;
  motorcycleName: string; // For display
  motorcyclePrice: number; // Total price
  clients: Client[];
  // Callback after any sale process (reservation, current account creation) is done
  onSaleProcessCompleted: (data: {
    type: "reservation" | "current_account" | "other_payment";
    payload: Record<string, unknown>;
  }) => void;
}

export function ReserveModal({
  open,
  onClose,
  motorcycleId,
  motorcycleName,
  motorcyclePrice,
  clients,
  onSaleProcessCompleted,
}: SaleModalProps) {
  // States for general payment fields (used if not 'current_account')
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "ARS">("USD");
  const [notes, setNotes] = useState<string>("");

  const [selectedClientId, setSelectedClientId] = useState("");
  const [processing, setProcessing] = useState(false);

  // States for payment method selection
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("");
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);

  const selectedPaymentMethod = paymentMethods.find(
    (pm) => pm.id.toString() === selectedPaymentMethodId,
  );
  const isCurrentAccountSelected = selectedPaymentMethod?.type === "current_account";

  useEffect(() => {
    if (open) {
      // Reset form states when modal opens
      setAmount("");
      setCurrency("USD");
      setNotes("");
      setSelectedClientId("");
      setSelectedPaymentMethodId("");
      setProcessing(false);
      setPaymentMethodError(null);

      // Fetch payment methods
      const fetchMethods = async () => {
        setIsLoadingPaymentMethods(true);
        try {
          const paymentMethods = await getAllPaymentMethods();
          setPaymentMethods(paymentMethods);
        } catch (error) {
          setPaymentMethodError("No se pudieron cargar los métodos de pago.");
        }
        setIsLoadingPaymentMethods(false);
      };
      fetchMethods();
    }
  }, [open]);

  // Update amount to motorcyclePrice when a non-current_account payment method is selected
  useEffect(() => {
    if (selectedPaymentMethod && !isCurrentAccountSelected) {
      setAmount(motorcyclePrice.toString());
    }
  }, [selectedPaymentMethod, isCurrentAccountSelected, motorcyclePrice]);

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCurrentAccountSelected) {
      // Submission is handled by CurrentAccountPaymentForm, this button might be hidden or disabled
      console.log("Cuenta corriente seleccionada, el envío es a través de su propio formulario.");
      return;
    }

    if (!motorcycleId || !selectedClientId || !amount || !selectedPaymentMethodId) {
      // Basic validation for non-current account payments
      alert("Por favor, complete todos los campos requeridos para el pago.");
      return;
    }

    setProcessing(true);
    try {
      // This is still using createReservation. Ideally, you'd have a more general createSaleAction.
      const result = await createReservation({
        motorcycleId,
        clientId: selectedClientId,
        amount: Number.parseFloat(amount),
        currency,
        expirationDate: null, // Or make this configurable
        paymentMethod: selectedPaymentMethod?.name || "Desconocido",
        notes: notes || null,
      });

      if (result.success && result.data) {
        onSaleProcessCompleted({ type: "reservation", payload: result.data }); // 'reservation' as placeholder
        onCloseClean();
      } else {
        alert(`Error al procesar el pago: ${result.error}`);
      }
    } catch (error) {
      alert(`Error al procesar el pago: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleCurrentAccountSuccess = (createdAccount: CurrentAccount) => {
    onSaleProcessCompleted({ type: "current_account", payload: createdAccount });
    onCloseClean();
  };

  const onCloseClean = () => {
    // Reset all states before closing
    setAmount("");
    setSelectedClientId("");
    setSelectedPaymentMethodId("");
    setCurrency("USD");
    setNotes("");
    setPaymentMethods([]);
    setPaymentMethodError(null);
    setIsLoadingPaymentMethods(false);
    setProcessing(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCloseClean();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Venta: {motorcycleName}</DialogTitle>
          <DialogDescription>
            Precio Total: ${motorcyclePrice.toLocaleString()} {currency}
          </DialogDescription>
        </DialogHeader>

        {/* Client Selection */}
        <div className="grid gap-2 py-2">
          <Label htmlFor="client">Cliente</Label>
          <Select value={selectedClientId} onValueChange={setSelectedClientId} required>
            <SelectTrigger id="client">
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                  {client.companyName ? `(${client.companyName})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Method Selection */}
        <div className="grid gap-2 py-2">
          <Label htmlFor="paymentMethod">Método de pago</Label>
          {isLoadingPaymentMethods ? (
            <p>Cargando métodos de pago...</p>
          ) : paymentMethodError ? (
            <p className="text-destructive">{paymentMethodError}</p>
          ) : (
            <Select
              value={selectedPaymentMethodId}
              onValueChange={setSelectedPaymentMethodId}
              required
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Seleccionar método de pago" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id.toString()}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {isCurrentAccountSelected && selectedClientId ? (
          <CurrentAccountPaymentForm
            clientId={selectedClientId} // Ensure client is selected
            modelId={motorcycleId} // Assuming modelId is appropriate here, or pass actual modelId if different
            motorcyclePrice={motorcyclePrice}
            onSuccess={handleCurrentAccountSuccess}
            onCancel={onCloseClean} // Or a more specific cancel if needed for this form step
            parentIsLoading={processing} // Disable form if main modal is processing something
          />
        ) : selectedPaymentMethodId ? (
          // Form for other payment methods (simplified, using existing reservation fields)
          <form onSubmit={handleGeneralSubmit} className="grid gap-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Monto a pagar</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount} // This will be pre-filled with motorcyclePrice
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  readOnly // Typically the full amount for non-current account simple payments
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  value={currency}
                  onValueChange={(value) => setCurrency(value as "USD" | "ARS")}
                  required
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="ARS">ARS</SelectItem>
                    {/* Add other currencies as needed */}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones (ej: referencia de transferencia)"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onCloseClean}
                disabled={processing}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={processing || !selectedClientId || !amount}>
                {processing ? "Procesando..." : "Confirmar Pago"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-4 text-sm text-muted-foreground">
            Seleccione un cliente y un método de pago para continuar.
          </div>
        )}

        {/* Footer is handled by specific forms now, or can be general if no form shown */}
        {!selectedPaymentMethodId && (
          <DialogFooter className="pt-4">
            <Button type="button" variant="secondary" onClick={onCloseClean}>
              Cerrar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
