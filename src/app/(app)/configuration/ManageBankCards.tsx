"use client";

import { useState, useTransition, useOptimistic } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
    DialogClose
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Plus,
    GripVertical,
    Trash2,
    CreditCard,
    Building
} from "lucide-react";
import {
    associateMultipleCardTypesToBank,
    toggleBankCardStatus,
    updateBankCardsOrder,
    dissociateBankCard
} from "@/actions/bank-cards/manage-bank-cards";
import type { Bank } from "@/types/banking-promotions";
import type { CardType, BankWithCards } from "@/types/bank-cards";
import { Spinner } from "@/components/custom/Spinner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Usar las librerías DND que ya están instaladas
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CreateCardTypeModal from "./CreateCardTypeModal";

interface ManageBankCardsProps {
    initialBanksWithCards: BankWithCards[];
    availableCardTypes: CardType[];
    availableBanks: Bank[];
    organizationId: string;
}

// Componente para un item de tarjeta sortable
interface SortableCardItemProps {
    id: number;
    bankId: number;
    cardTypeName: string;
    cardTypeType: string;
    isEnabled: boolean;
    onToggle: (id: number, isEnabled: boolean, bankId: number) => void;
    onDelete: (id: number, bankId: number) => void;
}

function SortableCardItem({ id, bankId, cardTypeName, cardTypeType, isEnabled, onToggle, onDelete }: SortableCardItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center justify-between p-3 border rounded-md bg-background"
        >
            <div className="flex items-center">
                <div {...attributes} {...listeners} className="mr-2 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    <span>{cardTypeName}</span>
                    <Badge
                        variant="outline"
                        className={cn(
                            "ml-2 text-xs",
                            cardTypeType === 'credit'
                                ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
                                : "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400"
                        )}
                    >
                        {cardTypeType === 'credit' ? 'Crédito' : 'Débito'}
                    </Badge>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => onToggle(id, checked, bankId)}
                    aria-label={`Habilitar/deshabilitar ${cardTypeName}`}
                />
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar asociación?</AlertDialogTitle>
                            <AlertDialogDescription>
                                ¿Estás seguro de que deseas eliminar la asociación con {cardTypeName}?
                                <p className="mt-2 font-medium">
                                    Nota: Si esta asociación está siendo utilizada en alguna promoción,
                                    no podrá ser eliminada.
                                </p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => onDelete(id, bankId)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

export default function ManageBankCards({
    initialBanksWithCards,
    availableCardTypes,
    availableBanks,
    organizationId
}: ManageBankCardsProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // Real state
    const [actualBankCardsState, setActualBankCardsState] = useState<BankWithCards[]>(initialBanksWithCards);
    // Optimistic state
    const [optimisticBankCardsState, setOptimisticBankCardsState] = useOptimistic(
        actualBankCardsState,
        (state, newState: BankWithCards[]) => newState
    );

    // State for banks with cards
    const [bankCardsState, setBankCardsState] = useState<BankWithCards[]>(actualBankCardsState);

    // State for modals
    const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
    // State for the associate card type modal
    const [isAssociateCardModalOpen, setIsAssociateCardModalOpen] = useState(false);
    const [associatingBank, setAssociatingBank] = useState<BankWithCards | null>(null);
    // State to track selected card types in the associate modal
    const [selectedCardTypeIds, setSelectedCardTypeIds] = useState<Set<number>>(new Set());
    // State for the create card type modal
    const [isCreateCardModalOpen, setIsCreateCardModalOpen] = useState(false);
    const [currentSearchText, setCurrentSearchText] = useState(""); // To prefill the name

    // Setup sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAssociateSelectedCards = () => {
        if (!associatingBank || selectedCardTypeIds.size === 0) return;

        const bankId = associatingBank.bank.id;
        const cardTypeIdsToAssociate = Array.from(selectedCardTypeIds);

        // Optimistic Update Calculation
        const newState = actualBankCardsState.map(bankWithCards => {
            if (bankWithCards.bank.id === bankId) {
                const cardsToAdd = cardTypeIdsToAssociate
                    .map(id => availableCardTypes.find(ct => ct.id === id))
                    .filter((ct): ct is CardType => !!ct)
                    .map((cardType, index) => ({
                        id: -(index + 1),
                        cardType: cardType,
                        isEnabled: true,
                        order: (bankWithCards.cards.length || 0) + index
                    }));
                return {
                    ...bankWithCards,
                    cards: [...bankWithCards.cards, ...cardsToAdd as any]
                };
            }
            return bankWithCards;
        });

        startTransition(async () => {
            setOptimisticBankCardsState(newState);

            // Call the *single* batch server action
            const result = await associateMultipleCardTypesToBank(null, {
                bankId,
                cardTypeIds: cardTypeIdsToAssociate,
                organizationId
            });

            // Handle results (simpler now)
            if (result.success) {
                toast({ title: "Asociaciones Guardadas", description: result.message });
                // Actualizar el estado real para que coincida con el optimista
                setActualBankCardsState(newState);
                // También actualizar el estado de banksCardState para mantener todo sincronizado
                setBankCardsState(newState);
            } else {
                toast({ title: "Error en Asociación", description: result.error, variant: "destructive" });
                // Rollback is automatic
            }

            setIsAssociateCardModalOpen(false);
            setSelectedCardTypeIds(new Set());
        });
    };

    const handleDissociateCard = (bankCardId: number, bankId: number) => {
        // Optimistic Update Calculation
        const cardName = actualBankCardsState
            .find(b => b.bank.id === bankId)?.cards
            .find(c => c.id === bankCardId)?.cardType?.name || 'la tarjeta';
        const newState = actualBankCardsState.map(bwc => {
            if (bwc.bank.id === bankId) {
                return { ...bwc, cards: bwc.cards.filter(card => card.id !== bankCardId) };
            }
            return bwc;
        });

        startTransition(async () => {
            setOptimisticBankCardsState(newState);
            const result = await dissociateBankCard(null, { bankCardId });

            if (result.success) {
                toast({ title: "Asociación eliminada", description: `Se eliminó la asociación con ${cardName}.` });
            } else {
                toast({ title: "Error", description: result.error || "Error al eliminar asociación.", variant: "destructive" });
            }
        });
    };

    const handleToggleCardStatus = (bankCardId: number, isEnabled: boolean, bankId: number) => {
        // Optimistic Update Calculation
        const cardName = actualBankCardsState
            .find(b => b.bank.id === bankId)?.cards
            .find(c => c.id === bankCardId)?.cardType?.name || 'la tarjeta';
        const newState = actualBankCardsState.map(bwc => {
            if (bwc.bank.id === bankId) {
                return {
                    ...bwc,
                    cards: bwc.cards.map(card =>
                        card.id === bankCardId ? { ...card, isEnabled } : card
                    )
                };
            }
            return bwc;
        });

        startTransition(async () => {
            setOptimisticBankCardsState(newState);
            const result = await toggleBankCardStatus(null, { bankCardId, isEnabled });

            if (result.success) {
                toast({ title: isEnabled ? "Habilitada" : "Deshabilitada", description: `Se ${isEnabled ? 'habilitó' : 'deshabilitó'} ${cardName}.` });
            } else {
                toast({ title: "Error", description: result.error || "Error al cambiar el estado.", variant: "destructive" });
            }
        });
    };

    const handleDragEnd = (event: DragEndEvent, bankId: number) => {
        const { active, over } = event;
        if (!active || !over || active.id === over.id) return;

        const bankIndex = actualBankCardsState.findIndex(b => b.bank.id === bankId);
        if (bankIndex === -1) return;

        const currentCards = [...actualBankCardsState[bankIndex].cards];
        const oldIndex = currentCards.findIndex(card => card.id === active.id);
        const newIndex = currentCards.findIndex(card => card.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const newCards = arrayMove(currentCards, oldIndex, newIndex);
        const newState = [...actualBankCardsState];
        newState[bankIndex] = {
            ...newState[bankIndex],
            cards: newCards.map((card, index) => ({ ...card, order: index }))
        };

        // Filtrar IDs temporales (negativos) antes de enviar al servidor
        const bankCardOrders = newCards
            .filter(card => card.id > 0) // Solo IDs positivos son válidos para la BD
            .map((card, index) => ({ id: card.id, order: index }));

        // Si no hay tarjetas válidas para actualizar, solo actualizamos el estado local
        if (bankCardOrders.length === 0) {
            setOptimisticBankCardsState(newState);
            setActualBankCardsState(newState);
            return;
        }

        startTransition(async () => {
            setOptimisticBankCardsState(newState);

            try {
                const result = await updateBankCardsOrder(null, { bankCardOrders });

                if (result.success) {
                    toast({ title: "Orden actualizado", description: result.message });
                    // Actualizar también el estado real
                    setActualBankCardsState(newState);
                } else {
                    toast({ title: "Error", description: result.error || "Error al actualizar el orden.", variant: "destructive" });
                }
            } catch (error) {
                console.error("Error updating bank cards order:", error);
                toast({
                    title: "Error",
                    description: "Ocurrió un error al actualizar el orden. Algunas tarjetas podrían tener un ID temporal.",
                    variant: "destructive"
                });
            }
        });
    };

    // Handle adding a bank to the management list (client-side state update)
    const handleAddBank = (bankId: number) => {
        const bankToAdd = availableBanks.find(b => b.id === bankId);

        if (!bankToAdd) {
            toast({ title: "Error", description: "No se pudo encontrar el banco seleccionado.", variant: "destructive" });
            return;
        }

        // Check if bank is already in state (shouldn't happen due to filtering, but good practice)
        if (bankCardsState.some(bws => bws.bank.id === bankId)) {
            toast({ title: "Información", description: "Este banco ya está siendo gestionado." });
            setIsAddBankModalOpen(false); // Close modal anyway
            return;
        }

        // Optimistically add the bank to the state with an empty cards array
        setBankCardsState(prev => [
            ...prev,
            {
                bank: bankToAdd,
                cards: [] // Start with no associated cards
            }
        ].sort((a, b) => a.bank.name.localeCompare(b.bank.name))); // Keep the list sorted

        setIsAddBankModalOpen(false);
        toast({
            title: "Banco Agregado",
            description: `${bankToAdd.name} ha sido añadido a la lista. Ahora puedes asociarle tipos de tarjeta.`
        });
    };

    // --- Handler for when a new card type is successfully created --- 
    const handleCardTypeCreated = (newCardType: CardType) => {
        console.log("New Card Type Created:", newCardType);
        toast({ title: "Tipo de tarjeta creado", description: `'${newCardType.name}' se ha creado. Estará disponible la próxima vez que cargue esta página.` });
    };

    // Banks already added to the management list
    const addedBankIds = new Set(optimisticBankCardsState.map(b => b.bank.id));

    // Calculate available card types for the modal, excluding already associated ones
    const currentBankAssociatedCardTypeIds = new Set(
        optimisticBankCardsState.find(b => b.bank.id === associatingBank?.bank.id)
            ?.cards.map(c => c.cardType.id) ?? []
    );
    const cardTypesForModal = availableCardTypes.filter(
        ct => !currentBankAssociatedCardTypeIds.has(ct.id)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Dialog open={isAddBankModalOpen} onOpenChange={setIsAddBankModalOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Agregar Banco
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Agregar Banco a Gestionar</DialogTitle>
                            <DialogDescription>
                                Selecciona un banco de la lista para empezar a asociarle tipos de tarjeta.
                            </DialogDescription>
                        </DialogHeader>
                        <Command className="rounded-lg border shadow-md mt-4">
                            <CommandInput placeholder="Buscar banco..." />
                            <CommandList>
                                <CommandEmpty>No se encontraron bancos disponibles.</CommandEmpty>
                                <CommandGroup>
                                    {availableBanks
                                        .filter(bank => !addedBankIds.has(bank.id)) // Show only banks not yet added
                                        .map((bank) => (
                                            <CommandItem
                                                key={bank.id}
                                                value={bank.name}
                                                onSelect={() => handleAddBank(bank.id)} // Call handler on select
                                                className="cursor-pointer"
                                            >
                                                {bank.name}
                                            </CommandItem>
                                        ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        <DialogFooter className="mt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Cancelar
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Bancos y Tarjetas Gestionadas</CardTitle>
                </CardHeader>
                <CardContent>
                    {optimisticBankCardsState.length === 0 ? (
                        <div className="text-center p-6 border rounded-md">
                            <p className="text-muted-foreground">No hay bancos configurados.</p>
                            <p className="text-sm mt-2">Haz clic en "Agregar Banco" para empezar.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {optimisticBankCardsState.map((bankWithCards) => (
                                <Card key={bankWithCards.bank.id} className="overflow-hidden">
                                    <CardHeader className="pb-2 bg-muted/50 border-b">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-base flex items-center">
                                                <Building className="h-4 w-4 mr-2" />
                                                {bankWithCards.bank.name}
                                            </CardTitle>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setAssociatingBank(bankWithCards);
                                                    setSelectedCardTypeIds(new Set()); // Reset selection
                                                    setIsAssociateCardModalOpen(true);
                                                }}
                                            >
                                                <Plus className="mr-1 h-3 w-3" /> Asociar Tarjeta
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        {bankWithCards.cards.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No hay tipos de tarjeta asociados a este banco.
                                            </p>
                                        ) : (
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={(event) => handleDragEnd(event, bankWithCards.bank.id)}
                                            >
                                                <SortableContext
                                                    items={bankWithCards.cards.map(card => card.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    <div className="space-y-2">
                                                        {bankWithCards.cards.map((card) => (
                                                            <SortableCardItem
                                                                key={card.id}
                                                                id={card.id}
                                                                bankId={bankWithCards.bank.id}
                                                                cardTypeName={card.cardType.name}
                                                                cardTypeType={card.cardType.type}
                                                                isEnabled={card.isEnabled}
                                                                onToggle={handleToggleCardStatus}
                                                                onDelete={(id, bankId) => handleDissociateCard(id, bankId)}
                                                            />
                                                        ))}
                                                    </div>
                                                </SortableContext>
                                            </DndContext>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Associate Card Type Modal Implementation */}
            <Dialog
                open={isAssociateCardModalOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedCardTypeIds(new Set());
                        setCurrentSearchText(""); // Reset search text on close
                    }
                    setIsAssociateCardModalOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Asociar Tipos de Tarjeta a {associatingBank?.bank.name}</DialogTitle>
                        <DialogDescription>
                            Selecciona los tipos de tarjeta que deseas habilitar para este banco.
                        </DialogDescription>
                    </DialogHeader>
                    <Command className="rounded-lg border shadow-md mt-4">
                        <CommandInput
                            placeholder="Buscar tipo de tarjeta..."
                            value={currentSearchText} // Control search text
                            onValueChange={setCurrentSearchText} // Update search text state
                        />
                        <CommandList className="max-h-[300px]">
                            <CommandEmpty>
                                <div className="text-center py-4">
                                    <p>No se encontraron tipos de tarjeta.</p>
                                    {currentSearchText && ( // Show create button only if there was a search term
                                        <Button
                                            variant="link"
                                            className="mt-2 h-auto p-0 text-sm"
                                            onClick={() => {
                                                setIsAssociateCardModalOpen(false); // Close current modal
                                                setIsCreateCardModalOpen(true); // Open create modal
                                            }}
                                        >
                                            Crear tipo de tarjeta: "{currentSearchText}"?
                                        </Button>
                                    )}
                                </div>
                            </CommandEmpty>
                            <CommandGroup>
                                {cardTypesForModal.map((cardType) => (
                                    <CommandItem
                                        key={cardType.id}
                                        value={cardType.name}
                                        className="cursor-pointer flex items-center gap-2"
                                        onSelect={() => { // Toggle selection
                                            setSelectedCardTypeIds(prev => {
                                                const newSet = new Set(prev);
                                                if (newSet.has(cardType.id)) {
                                                    newSet.delete(cardType.id);
                                                } else {
                                                    newSet.add(cardType.id);
                                                }
                                                return newSet;
                                            });
                                        }}
                                    >
                                        <Checkbox
                                            id={`cardType-${cardType.id}`}
                                            checked={selectedCardTypeIds.has(cardType.id)}
                                            className="pointer-events-none" // Prevent checkbox click interfering with CommandItem
                                        />
                                        <label
                                            htmlFor={`cardType-${cardType.id}`}
                                            className="flex-grow cursor-pointer pointer-events-none"
                                        >
                                            {cardType.name}
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "ml-2 text-xs",
                                                    cardType.type === 'credit'
                                                        ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
                                                        : "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400"
                                                )}
                                            >
                                                {cardType.type === 'credit' ? 'Crédito' : 'Débito'}
                                            </Badge>
                                        </label>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                    <DialogFooter className="mt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancelar
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            disabled={isPending || selectedCardTypeIds.size === 0}
                            onClick={handleAssociateSelectedCards} // Call the handler
                        >
                            {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                            Guardar Asociaciones
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Card Type Modal */}
            <CreateCardTypeModal
                isOpen={isCreateCardModalOpen}
                onOpenChange={setIsCreateCardModalOpen}
                onSuccess={handleCardTypeCreated} // Pass the handler
                initialName={currentSearchText} // Pass search text as initial name
            />
        </div>
    );
} 