"use server";

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InventoryReportPDF } from "@/components/pdf/InventoryReportPDF";
import { getInventoryStatusReport } from "@/lib/reports/inventory";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function generateInventoryReportPDF(dateRange?: { from?: Date; to?: Date }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        redirect("/auth/signin");
    }

    const data = await getInventoryStatusReport(dateRange);
    const pdf = await renderToBuffer(<InventoryReportPDF data={data} dateRange={dateRange} />);

    return new Response(pdf, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=inventory-report.pdf",
        },
    });
} 