import { z } from "zod";
import { NextResponse } from "next/server";
import { renderToStream, renderToBuffer, Font } from "@react-pdf/renderer";
import PettyCashActivityReportPDF from '@/components/custom/reports/PettyCashActivityReportPDF';
import type { ReportDataForPdf } from "@/types/PettyCashActivity";
import React, { type ReactElement } from 'react';
import prisma from "@/lib/prisma";
import { getOrganizationIdFromSession } from "@/actions/get-Organization-Id-From-Session";
import type { PettyCashActivityReportPDFProps } from '@/types/PettyCashActivity';

// branchId puede ser un string (ID numérico o "general_account") o no estar definido.
const querySchema = z.object({
    fromDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
        message: "fromDate debe ser una fecha válida",
    }),
    toDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
        message: "toDate debe ser una fecha válida",
    }),
    branchId: z.string().optional(), // Sigue siendo opcional
});

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    console.log("Query params received by API:", queryParams);

    const validatedQuery = querySchema.safeParse(queryParams);

    if (!validatedQuery.success) {
        console.error("Validation failed. Errors:", validatedQuery.error.flatten());
        return NextResponse.json({ error: "Parámetros inválidos", details: validatedQuery.error.flatten() }, { status: 400 });
    }

    // branchId vendrá como string aquí si está presente.
    const { fromDate, toDate, branchId } = validatedQuery.data;
    const org = await getOrganizationIdFromSession();

    if (org.error || !org.organizationId) {
        return NextResponse.json({ error: org.error || "Organization ID not found in session" }, { status: 401 });
    }

    const startDate = new Date(fromDate);
    const endDateForQuery = new Date(toDate);
    endDateForQuery.setHours(23, 59, 59, 999);

    // Construir la condición de sucursal para Prisma
    let branchCondition = {};
    if (branchId) {
        if (branchId === "general_account") {
            branchCondition = { branchId: null };
        } else {
            // Asumimos que cualquier otro string es un ID numérico válido para parsear
            const parsedBranchId = Number.parseInt(branchId, 10);
            if (!Number.isNaN(parsedBranchId)) {
                branchCondition = { branchId: parsedBranchId };
            } else {
                // Si no es "general_account" y no es un número parseable, podría ser un error o ignorarlo.
                // Por ahora, si no es parseable, no se filtrará por branchId específico.
                // Considera devolver un error 400 si se espera un ID numérico aquí y no lo es.
                console.warn(`branchId '${branchId}' no es 'general_account' ni un ID numérico válido.`);
            }
        }
    }
    // Si branchId no está presente en la URL (es decir, se quiere "Todas las sucursales"), 
    // branchCondition permanece como objeto vacío, por lo que no se aplica filtro de sucursal.

    try {
        const pettyCashDeposits = await prisma.pettyCashDeposit.findMany({
            where: {
                organizationId: org.organizationId,
                date: {
                    gte: startDate,
                    lte: endDateForQuery,
                },
                ...branchCondition, // Aplicar la condición de sucursal
            },
            include: {
                branch: true,
                withdrawals: {
                    include: {
                        spends: {
                            orderBy: { date: 'asc' }
                        },
                    },
                    orderBy: { date: 'asc' }
                },
            },
            orderBy: { date: 'asc' }
        }) as ReportDataForPdf[]; 

        if (!pettyCashDeposits || pettyCashDeposits.length === 0) {
            const pdfDocProps = {
                data: [],
                fromDate: startDate,
                toDate: new Date(toDate)
            };
            const pdfDoc = React.createElement(PettyCashActivityReportPDF, pdfDocProps as PettyCashActivityReportPDFProps);

            const pdfBuffer = await renderToBuffer(pdfDoc as ReactElement<typeof PettyCashActivityReportPDF>);

            return new NextResponse(Buffer.from(pdfBuffer).buffer, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="reporte_actividad_caja_chica_vacio.pdf"`,
                },
            });
        }
        
        const pdfDocPropsFilled = {
            data: pettyCashDeposits,
            fromDate: startDate,
            toDate: new Date(toDate)
        };
        const pdfDoc = React.createElement(PettyCashActivityReportPDF, pdfDocPropsFilled as PettyCashActivityReportPDFProps);

        const pdfBuffer = await renderToBuffer(pdfDoc as ReactElement<typeof PettyCashActivityReportPDF>);

        const safeFromDate = startDate.toISOString().split('T')[0];
        const safeToDate = new Date(toDate).toISOString().split('T')[0];

        return new NextResponse(Buffer.from(pdfBuffer).buffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="reporte_actividad_caja_chica_${safeFromDate}_a_${safeToDate}.pdf"`,
            },
        });

    } catch (error) {
        console.error("Error generando el PDF de actividad de caja chica:", error);
        return NextResponse.json({ error: "Error interno del servidor al generar el PDF." }, { status: 500 });
    }
} 