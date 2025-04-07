'use client';

import { useState } from 'react';

type ActionState = {
    success: boolean;
    error: string;
};

export function useActionState<T extends (...args: any[]) => Promise<ActionState>>(
    action: T,
    initialState: ActionState
): [ActionState, T, boolean] {
    const [state, setState] = useState<ActionState>(initialState);
    const [isPending, setIsPending] = useState(false);

    const wrappedAction = (async (...args: Parameters<T>) => {
        try {
            setIsPending(true);
            const result = await action(...args);
            setState(result);
            return result;
        } finally {
            setIsPending(false);
        }
    }) as T;

    return [state, wrappedAction, isPending];
} 