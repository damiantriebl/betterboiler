// --- CAMBIOS PARA CLIENTES ---
// Adaptar la página de detalle para clientes
import { getClientById } from "@/actions/clients/manage-clients";
import { notFound } from "next/navigation";
import ClientForm from "../ClientForm";
import type { ClientFormData } from "@/zod/ClientsZod";

interface ClientPageProps {
    params: Promise<{ id: string }>;
}

const ClientPage = async ({ params }: ClientPageProps) => {
    const { id } = await params;

    try {
        const client = await getClientById(id);

        if (!client) {
            notFound();
        }

        // Mapear el cliente de Prisma al formato que espera ClientForm
        const clientFormData: Partial<ClientFormData & { id?: string }> = {
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName || undefined,
            companyName: client.companyName || undefined,
            email: client.email,
            phone: client.phone || undefined,
            mobile: client.mobile || undefined,
            taxId: client.taxId,
            address: client.address || undefined,
            vatStatus: client.vatStatus || undefined,
            type: client.type as "Individual" | "LegalEntity",
            status: client.status as "active" | "inactive",
            notes: client.notes || undefined,
        };

        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Editar Cliente</h1>
                <ClientForm client={clientFormData} />
            </div>
        );
    } catch (error) {
        console.error("Error loading client:", error);
        notFound();
    }
};

export default ClientPage;
