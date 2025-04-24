// components/ClientDetail.tsx
'use client';

import { use } from 'react';
import { getClientById } from '@/actions/clients/get-client-by-id';
import { DetailItem } from './DetailItem';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { User } from 'lucide-react';

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
    const client = use(getClientById(clientId));
    if (!client) return <p className="text-sm text-muted-foreground">Cliente no encontrado.</p>;

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
                                <div className="text-sm bg-white p-2 rounded border whitespace-pre-wrap">
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
