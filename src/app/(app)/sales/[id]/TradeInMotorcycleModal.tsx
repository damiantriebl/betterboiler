"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NewStockClientContainer } from "@/app/(app)/stock/new/NewStockClientContainer";
import { getFormData } from "@/actions/stock";
import type { FormDataResult } from "@/actions/stock/form-data-unified";

interface TradeInMotorcycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TradeInMotorcycleModal({ open, onOpenChange }: TradeInMotorcycleModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FormDataResult | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getFormData()
        .then((res) => setData(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Ingresar Moto en Permuta</DialogTitle>
        </DialogHeader>
        {loading && <p>Cargando...</p>}
        {!loading && data && (
          <NewStockClientContainer
            availableColors={data.availableColors}
            availableBrands={data.availableBrands}
            availableBranches={data.availableBranches}
            suppliers={data.suppliers}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
