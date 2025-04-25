import prisma from "@/lib/prisma";
import type { InventoryStatusReport } from "@/types/reports";
import { MotorcycleState, type Motorcycle } from "@prisma/client";
import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";

type StateGroup = {
    state: string;
    _count: number;
};

type ValueStateGroup = {
    state: string;
    currency: string;
    _sum: {
        retailPrice: number | null;
        costPrice: number | null;
    };
};

type BrandGroup = {
    brandId: number;
    brandName: string;
    _count: number;
};

export async function getInventoryStatusReport(dateRange?: { from?: Date; to?: Date }): Promise<InventoryStatusReport> {
    const organizationId = await getOrganizationIdFromSession();

    // Obtener el conteo por estado
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
        _count: {
            _all: true
        }
    });

    // Obtener valores por estado
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
            costPrice: true,
        },
    });

    // Obtener conteo por marca usando findMany
    const motorcycles = await prisma.motorcycle.findMany({
        where: {
            organizationId,
            ...(dateRange?.from && {
                createdAt: {
                    gte: dateRange.from,
                    ...(dateRange.to && { lte: dateRange.to })
                }
            })
        },
        select: {
            brandId: true,
            brand: {
                select: {
                    name: true
                }
            }
        }
    });

    // Agrupar por marca manualmente
    const brandGroups = motorcycles.reduce((acc: { [key: number]: BrandGroup }, motorcycle) => {
        const brandId = motorcycle.brandId;
        const brandName = motorcycle.brand?.name ?? "Desconocida";
        
        if (!acc[brandId]) {
            acc[brandId] = {
                brandId: Number(brandId),
                brandName,
                _count: 0
            };
        }
        acc[brandId]._count++;
        return acc;
    }, {});

    // Calcular el resumen
    const summary = {
        total: byState.reduce((acc, curr) => acc + curr._count._all, 0),
        inStock: byState.find(s => s.state === "STOCK")?._count._all ?? 0,
        reserved: byState.find(s => s.state === "RESERVADO")?._count._all ?? 0,
        sold: byState.find(s => s.state === "VENDIDO")?._count._all ?? 0,
    };

    return {
        byState: byState.map(s => ({
            state: s.state as MotorcycleState,
            _count: s._count._all,
        })),
        valueByState: valueByState.map(v => ({
            state: v.state as MotorcycleState,
            currency: v.currency,
            _sum: {
                retailPrice: v._sum.retailPrice,
                costPrice: v._sum.costPrice,
            },
        })),
        byBrand: Object.values(brandGroups),
        summary,
    };
} 