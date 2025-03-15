import CreateOrEditOrganization from "@/app/root/CreateOrEditOrganization";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";

export default async function OrganizationTable() {
  const organizations =  await prisma.organization.findMany();
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
            <TableCell>{org.logo}</TableCell>
            <TableCell>
              <CreateOrEditOrganization organization={org} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
