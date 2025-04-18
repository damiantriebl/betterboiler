import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const DeleteConfirmationDialog = ({
  showDeleteDialog,
  setShowDeleteDialog,
  selectedMoto,
  handleDelete,
}: {
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  selectedMoto: Motorcycle;
  handleDelete: () => void;
}) => (
  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>¿Estás seguro que deseas eliminar esta moto?</AlertDialogTitle>
        <AlertDialogDescription className=" flex flex-col gap-6">
          <p className="text-muted-foreground">
            No te preocupes, esta acción se puede deshacer más tarde si lo necesitas.
          </p>
          <p className="font-medium text-3xl">
            {selectedMoto?.marca} {selectedMoto?.modelo} {selectedMoto?.año}
          </p>
          <p className="text-muted-foreground text-lg">
            {selectedMoto?.cilindrada}cc - {selectedMoto?.tipo} - {selectedMoto?.ubicacion}
          </p>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel>No, cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
          Sí, eliminar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
export default DeleteConfirmationDialog;
