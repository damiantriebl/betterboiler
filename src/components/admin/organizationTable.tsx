import CreateOrEditOrganization from "@/app/root/CreateOrEditOrganization";
import DeleteOrganizationButton from "@/app/root/DeleteOrganizationButton";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import ImageZoom from "../custom/ImageZoom";

export default async function OrganizationTable() {
  const organizations = await prisma.organization.findMany();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Logo</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizations.map((org) => (
          <TableRow key={org.id}>
            <TableCell>{org.name}</TableCell>
            <TableCell>{org.slug}</TableCell>
            <TableCell>
              {(org.logo && org.logo.startsWith("/")) || org?.logo?.startsWith("http") ? (
                <ImageZoom organization={org.name} imgLow={org.logo} imgHd={org.logo} alt="Logo" />
              ) : (
                "Sin logo"
              )}
            </TableCell>
            <TableCell className="flex gap-2">
              <CreateOrEditOrganization organization={org} />
              <DeleteOrganizationButton id={org.id} name={org.name} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
