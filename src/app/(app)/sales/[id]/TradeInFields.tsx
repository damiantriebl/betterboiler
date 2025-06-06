"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TradeInMotorcycleModal from "./TradeInMotorcycleModal";
import type { PaymentFormData } from "./types";

interface TradeInFieldsProps {
  paymentData: PaymentFormData;
  onPaymentDataChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
}

export default function TradeInFields({
  paymentData,
  onPaymentDataChange,
}: TradeInFieldsProps) {
  const [selection, setSelection] = useState<"moto" | "otro">("moto");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-4 p-4 border rounded-md mt-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={selection === "moto" ? "default" : "outline"}
          onClick={() => {
            setSelection("moto");
            setModalOpen(true);
          }}
        >
          Moto
        </Button>
        <Button
          type="button"
          variant={selection === "otro" ? "default" : "outline"}
          onClick={() => setSelection("otro")}
        >
          Otro bien
        </Button>
      </div>

      {selection === "otro" && (
        <div className="space-y-2">
          <Label htmlFor="tradeInOtherName">Nombre</Label>
          <Input
            id="tradeInOtherName"
            name="tradeInOtherName"
            value={paymentData.tradeInOtherName || ""}
            onChange={onPaymentDataChange}
          />
          <Label htmlFor="tradeInOtherDescription">Descripción</Label>
          <Textarea
            id="tradeInOtherDescription"
            name="tradeInOtherDescription"
            value={paymentData.tradeInOtherDescription || ""}
            onChange={onPaymentDataChange}
          />
          <Label htmlFor="tradeInOtherPrice">Precio</Label>
          <Input
            id="tradeInOtherPrice"
            name="tradeInOtherPrice"
            type="number"
            value={paymentData.tradeInOtherPrice?.toString() || ""}
            onChange={onPaymentDataChange}
          />
        </div>
      )}

      <TradeInMotorcycleModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
