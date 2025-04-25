import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client } from "@/app/(app)/clients/columns";
import { createReservation } from "@/actions/sales/create-reservation";

interface ReserveModalProps {
  open: boolean;
  onClose: () => void;
  motorcycleId: number;
  clients: Client[];
  onReserved: (data: {
    motorcycleId: number;
    reservationId: number;
    amount: number;
    clientId: string;
    currency: string;
  }) => void;
}

export function ReserveModal({
  open,
  onClose,
  motorcycleId,
  clients,
  onReserved,
}: ReserveModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motorcycleId || !selectedClientId || !amount) return;

    setLoading(true);
    try {
      // Llamar a la función de servidor para crear la reserva
      const result = await createReservation({
        motorcycleId,
        clientId: selectedClientId,
        amount: Number.parseFloat(amount),
        currency: "USD",
        expirationDate: null,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
      });

      if (result.success && result.data) {
        // Notificar al componente padre
        onReserved({
          motorcycleId,
          reservationId: result.data.id,
          amount: Number.parseFloat(amount),
          clientId: selectedClientId,
          currency: "USD",
        });
        onClose();
      } else {
        console.error("Error al crear la reserva:", result.error);
        // Aquí podrías mostrar un mensaje de error
      }
    } catch (error) {
      console.error("Error al procesar la reserva:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setSelectedClientId("");
    setPaymentMethod("");
    setCurrency("USD");
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reservar Motocicleta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="client">Cliente</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId} required>
              <SelectTrigger id="client">
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Monto de la reserva</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select value={currency} onValueChange={setCurrency} required>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymentMethod">Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Seleccionar método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones adicionales"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Procesando..." : "Reservar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
