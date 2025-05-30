import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MotorcycleWithFullDetails } from "@/types/motorcycle";

const DeleteConfirmationDialog = ({
  showDeleteDialog,
  setShowDeleteDialog,
  selectedMoto,
  handleDelete,
}: {
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  selectedMoto: MotorcycleWithFullDetails | null;
  handleDelete: () => void;
}) => {
  // Si no hay moto seleccionada, no mostrar el diálogo
  if (!selectedMoto) {
    return null;
  }

  return (
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro que deseas eliminar esta moto?</AlertDialogTitle>
          <AlertDialogDescription>
            No te preocupes, esta acción se puede deshacer más tarde si lo necesitas.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="font-medium text-3xl">
            {selectedMoto.brand?.name} {selectedMoto.model?.name} {selectedMoto.year}
          </div>
          <div className="text-muted-foreground text-lg">
            {selectedMoto.displacement}cc - {selectedMoto.model?.name} - {selectedMoto.branch?.name}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>No, cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
            Sí, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationDialog;
