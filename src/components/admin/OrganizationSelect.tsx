"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface Org {
  id: string;
  name: string;
}

interface Props {
  userId: string;
  organizations: Org[];
  userActualOrganization?: Org | null;
}

export default function OrganizationSelect({
  userId,
  organizations,
  userActualOrganization,
}: Props) {
  const [selected, setSelected] = useState(userActualOrganization?.id || "");

  const handleChange = async (organizationId: string) => {
    try {
      setSelected(organizationId);

      const response = await fetch("/api/update-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, organizationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al actualizar la organización");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Error al actualizar la organización");
      }

      toast({
        title: "Éxito",
        description: "Organización actualizada correctamente",
      });
    } catch (error) {
      console.error("Error updating organization:", error);

      // Revertir la selección en caso de error
      setSelected(userActualOrganization?.id || "");

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error inesperado",
        variant: "destructive",
      });
    }
  };

  return (
    <Select onValueChange={handleChange} defaultValue={selected}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecciona una organización" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
