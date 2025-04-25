// components/ClientDetail.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { getClientById } from '@/actions/clients/get-client-by-id';
import { DetailItem } from '../../../components/custom/DetailItem';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { User, Loader2 } from 'lucide-react';
import type { Client } from '@prisma/client';

export function ClientDetail({
    clientId,
    currency,
    reservationData,
}: {
    clientId: string;
    currency: string;
    reservationData?: {
        amount?: number;
        createdAt?: string | Date;
        paymentMethod?: string | null;
        notes?: string | null;
    };
}) {
    const [client, setClient] = useState<Client | null | undefined>(undefined);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        if (!clientId) {
            setClient(null);
            return;
        }
        setClient(undefined);
        startTransition(async () => {
            try {
                const fetchedClient = await getClientById(clientId);
                setClient(fetchedClient);
            } catch (error) {
                console.error("[ClientDetail] Error fetching client:", error);
                setClient(null);
            }
        });
    }, [clientId]);

    if (isLoading || client === undefined) {
        return (
            <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando cliente...
            </div>
        );
    }

    if (!client) {
        return <p className="text-sm text-muted-foreground">Cliente no encontrado.</p>;
    }

    const clientName =
        client.type === 'Individual'
            ? `${client.firstName} ${client.lastName ?? ''}`
            : client.companyName;

    return (
        <>
            <DetailItem
                label="Cliente"
                value={
                    <Link
                        href={`/clients/${client.id}`}
                        className="flex items-center text-blue-600 hover:underline"
                    >
                        <User className="mr-1.5 h-3.5 w-3.5" />
                        {clientName}
                    </Link>
                }
            />
            {reservationData && (
                <>
                    <DetailItem
                        label="Monto Reserva"
                        value={
                            reservationData.amount
                                ? new Intl.NumberFormat('es-AR', {
                                    style: 'currency',
                                    currency,
                                }).format(reservationData.amount)
                                : 'No especificado'
                        }
                    />
                    <DetailItem
                        label="Fecha Reserva"
                        value={
                            reservationData.createdAt
                                ? format(new Date(reservationData.createdAt), 'dd/MM/yyyy HH:mm', {
                                    locale: es,
                                })
                                : 'Fecha no disponible'
                        }
                    />
                    <DetailItem label="Método de Pago" value={reservationData.paymentMethod || 'No especificado'} />
                    {reservationData.notes && (
                        <DetailItem
                            label="Notas"
                            value={
                                <div className="text-sm bg-white p-2 cursor-default rounded border whitespace-pre-wrap">
                                    {reservationData.notes}
                                </div>
                            }
                        />
                    )}
                </>
            )}
        </>
    );
}
