"use client";
import { useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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
    setSelected(organizationId);
    await fetch("/api/update-organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, organizationId }),
    });
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
