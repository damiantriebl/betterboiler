import { getMotorcycleById } from "@/actions/sales/get-motorcycle-by-id";
import { notFound } from "next/navigation";
import { EditMotorcycleForm } from "./EditMotorcycleForm";
import { getFormData } from "@/actions/stock";

interface EditMotorcyclePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditMotorcyclePage({ params }: EditMotorcyclePageProps) {
  const { id } = await params;
  console.log(id);

  const [motorcycle, formData] = await Promise.all([getMotorcycleById(id), getFormData()]);

  if (!motorcycle) {
    notFound(); // Mostrar página 404 si la moto no existe
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Editar Motocicleta</h1>
        <p className="text-muted-foreground">
          Modifica los detalles de la motocicleta ID: {motorcycle.id}.
        </p>
      </div>
      <EditMotorcycleForm
        motorcycle={motorcycle}
        formData={formData}
      />
    </main>
  );
}
