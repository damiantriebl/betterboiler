"use server";

import prisma from "@/lib/prisma";
import { MotorcycleState } from "@prisma/client";
import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";
import type { ReportFilters } from "@/types/reports";
import type { InventoryStatusReport } from "@/types/reports";

export async function getInventoryStatusReport(filters: ReportFilters): Promise<InventoryStatusReport> {
    const organizationId = filters.organizationId;
    const dateRange = filters.dateRange;

    // Obtener conteos por estado
    const byState = await prisma.motorcycle.groupBy({
        by: ['state'],
        where: {
            organizationId,
            ...(dateRange?.from && {
                createdAt: {
                    gte: dateRange.from,
                    ...(dateRange.to && { lte: dateRange.to })
                }
            })
        },
        _count: true
    });

    // Obtener valores por estado y moneda
    const valueByState = await prisma.motorcycle.groupBy({
        by: ['state', 'currency'],
        where: {
            organizationId,
            ...(dateRange?.from && {
                createdAt: {
                    gte: dateRange.from,
                    ...(dateRange.to && { lte: dateRange.to })
                }
            })
        },
        _sum: {
            retailPrice: true,
            costPrice: true
        }
    });

    // Obtener conteos por marca
    const byBrand = await prisma.motorcycle.groupBy({
        by: ['brandId'],
        where: {
            organizationId,
            ...(dateRange?.from && {
                createdAt: {
                    gte: dateRange.from,
                    ...(dateRange.to && { lte: dateRange.to })
                }
            })
        },
        _count: true
    });

    // Obtener nombres de marcas
    const brands = await prisma.brand.findMany({
        where: {
            id: {
                in: byBrand.map(b => b.brandId)
            }
        }
    });

    // Preparar el resumen
    const stateCount = new Map(byState.map(s => [s.state, s._count]));
    const summary = {
        total: byState.reduce((acc, curr) => acc + curr._count, 0),
        inStock: stateCount.get(MotorcycleState.STOCK) || 0,
        reserved: stateCount.get(MotorcycleState.RESERVADO) || 0,
        sold: stateCount.get(MotorcycleState.VENDIDO) || 0,
        processing: stateCount.get(MotorcycleState.PROCESANDO) || 0
    };

    // Formatear datos por marca
    const formattedByBrand = byBrand.map(item => ({
        brandId: item.brandId,
        brandName: brands.find(b => b.id === item.brandId)?.name || 'Desconocida',
        _count: item._count
    }));

    return {
        summary,
        byState: byState.map(item => ({
            state: item.state as MotorcycleState,
            _count: item._count
        })),
        byBrand: formattedByBrand,
        valueByState: valueByState.map(item => ({
            state: item.state as MotorcycleState,
            currency: item.currency,
            _sum: {
                retailPrice: item._sum.retailPrice || 0,
                costPrice: item._sum.costPrice || 0
            }
        }))
    };
} 