// app/current-accounts/components/AnnulPaymentButton.tsx
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { undoPayment, type UndoPaymentFormState } from "@/actions/current-accounts/undo-payment";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";

interface AnnulPaymentButtonProps {
    paymentId: string;
    onAnnulmentSuccess?: (paymentId: string) => void;
    buttonText?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
    size?: "default" | "sm" | "lg" | "icon" | null | undefined;
    className?: string;
}

const initialUndoState: UndoPaymentFormState = {
    message: "",
    success: false,
};

export default function AnnulPaymentButton({
    paymentId,
    onAnnulmentSuccess,
    buttonText = "Anular Pago",
    variant = "outline",
    size = "sm",
    className
}: AnnulPaymentButtonProps) {
    const [state, formAction, isPending] = useActionState(undoPayment, initialUndoState);
    const formRef = useRef<HTMLFormElement>(null);
    const [hasBeenProcessed, setHasBeenProcessed] = useState(false);

    useEffect(() => {
        if (state.success && !isPending && !hasBeenProcessed) {
            setHasBeenProcessed(true);
            if (onAnnulmentSuccess) {
                onAnnulmentSuccess(paymentId);
            }
        }
        if (paymentId) {
            setHasBeenProcessed(false);
        }
        if (state.message && !state.success) {
            setHasBeenProcessed(false);
        }

    }, [state, isPending, onAnnulmentSuccess, paymentId, hasBeenProcessed]);

    if (state.message && hasBeenProcessed && state.success) {
        return (
            <div className="flex flex-col items-start text-sm">
                <p className="text-blue-600">
                    {state.message} (Actualizando...)
                </p>
            </div>
        );
    }
    if (state.message && !state.success) {
        return (
            <div className="flex flex-col items-start text-sm">
                <form action={formAction} ref={formRef} className="inline-block">
                    <input type="hidden" name="paymentId" value={paymentId} />
                    <Button type="submit" variant={variant} size={size} disabled={isPending} className={className}>
                        {isPending ? (
                            <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /><span>Anulando...</span></>
                        ) : (
                            <span>{buttonText}</span>
                        )}
                    </Button>
                </form>
                <p className="text-red-600 mt-1">{state.message}</p>
            </div>
        );
    }

    return (
        <form action={formAction} ref={formRef} className="inline-block">
            <input type="hidden" name="paymentId" value={paymentId} />
            <Button
                type="submit"
                variant={variant}
                size={size}
                disabled={isPending || hasBeenProcessed}
                className={className}
            >
                {isPending ? (
                    <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        <span>Anulando...</span>
                    </>
                ) : (
                    <span>{buttonText}</span>
                )}
            </Button>
        </form>
    );
} 