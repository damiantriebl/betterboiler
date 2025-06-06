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
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface PermutaOtroBienData {
    titulo: string;
    descripcion: string;
    monto: number;
}

interface PermutaOtroBienModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: PermutaOtroBienData) => void;
}

export default function PermutaOtroBienModal({
    isOpen,
    onClose,
    onConfirm,
}: PermutaOtroBienModalProps) {
    const [formData, setFormData] = useState<PermutaOtroBienData>({
        titulo: "",
        descripcion: "",
        monto: 0,
    });

    const [errors, setErrors] = useState({
        titulo: "",
        descripcion: "",
        monto: "",
    });

    // Limpiar formulario cuando se abre/cierra el modal
    const handleModalChange = (open: boolean) => {
        if (!open) {
            onClose();
            resetForm();
        }
    };

    const resetForm = () => {
        setFormData({
            titulo: "",
            descripcion: "",
            monto: 0,
        });
        setErrors({
            titulo: "",
            descripcion: "",
            monto: "",
        });
    };

    const handleInputChange = (field: keyof PermutaOtroBienData, value: string | number) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));

        // Limpiar error del campo cuando el usuario empiece a escribir
        if (errors[field as keyof typeof errors]) {
            setErrors((prev) => ({
                ...prev,
                [field]: "",
            }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors = {
            titulo: "",
            descripcion: "",
            monto: "",
        };

        if (!formData.titulo.trim()) {
            newErrors.titulo = "El título es requerido";
        }

        if (!formData.descripcion.trim()) {
            newErrors.descripcion = "La descripción es requerida";
        }

        if (!formData.monto || formData.monto <= 0) {
            newErrors.monto = "El monto debe ser mayor a 0";
        }

        setErrors(newErrors);
        return !newErrors.titulo && !newErrors.descripcion && !newErrors.monto;
    };

    const handleConfirm = () => {
        if (validateForm()) {
            onConfirm(formData);
            onClose();
            resetForm();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleModalChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Agregar Otro Bien</DialogTitle>
                    <DialogDescription>
                        Especifica los detalles del bien que se intercambiará en la permuta
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Título */}
                    <div className="space-y-2">
                        <Label htmlFor="titulo">
                            Título <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="titulo"
                            placeholder="Ej: Lancha, Auto, Terreno..."
                            value={formData.titulo}
                            onChange={(e) => handleInputChange("titulo", e.target.value)}
                            className={errors.titulo ? "border-red-500" : ""}
                        />
                        {errors.titulo && <p className="text-sm text-red-500">{errors.titulo}</p>}
                    </div>

                    {/* Descripción */}
                    <div className="space-y-2">
                        <Label htmlFor="descripcion">
                            Descripción <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="descripcion"
                            placeholder="Ej: Lancha con motor Mercury de 300 caballos, año 2020..."
                            value={formData.descripcion}
                            onChange={(e) => handleInputChange("descripcion", e.target.value)}
                            className={`min-h-[80px] ${errors.descripcion ? "border-red-500" : ""}`}
                            rows={3}
                        />
                        {errors.descripcion && <p className="text-sm text-red-500">{errors.descripcion}</p>}
                    </div>

                    {/* Monto */}
                    <div className="space-y-2">
                        <Label htmlFor="monto">
                            Monto (USD) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="monto"
                            type="number"
                            placeholder="Ej: 8000"
                            value={formData.monto || ""}
                            onChange={(e) => handleInputChange("monto", Number(e.target.value))}
                            className={errors.monto ? "border-red-500" : ""}
                            min="0"
                            step="0.01"
                        />
                        {errors.monto && <p className="text-sm text-red-500">{errors.monto}</p>}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleModalChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm}>
                        Agregar Bien
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 