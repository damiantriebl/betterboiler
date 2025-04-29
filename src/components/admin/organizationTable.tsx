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
import { OrganizationLogo } from "@/components/custom/OrganizationLogo";

export default async function OrganizationTable() {
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      thumbnail: true
    }
  });
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Logo</TableHead>
          <TableHead>Miniatura</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizations.map((org) => (
          <TableRow key={org.id}>
            <TableCell>{org.name}</TableCell>
            <TableCell>{org.slug}</TableCell>
            <TableCell>
              {org.logo ? (
                <OrganizationLogo logo={org.logo} name={org.name} />
              ) : (
                <span className="text-xs text-muted-foreground">Sin logo</span>
              )}
            </TableCell>
            <TableCell>
              {org.thumbnail ? (
                <OrganizationLogo logo={org.thumbnail} name={`${org.name} thumbnail`} size="sm" />
              ) : (
                <span className="text-xs text-muted-foreground">Sin miniatura</span>
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
