"use server";

import prisma from "@/lib/prisma";
import { MotorcycleState, Motorcycle, Brand, Prisma } from "@prisma/client";
import { getOrganizationIdFromSession } from "@/actions/getOrganizationIdFromSession";

type InventoryReportType = {
    total: number;
    totalValue: number;
    byState: Array<{
        state: string;
        count: number;
    }>;
    valueByState: Array<{
        state: string;
        value: number;
    }>;
    byBrand: Array<{
        brandId: number;
        brandName: string;
        _count: number;
    }>;
};

type BrandCount = {
    brandId: number;
    brandName: string;
    _count: number;
};

type MotorcycleWithBrand = Motorcycle & {
    brand: Brand | null;
};

export async function getInventoryStatusReport(
    organizationId: string,
    dateRange?: { from: Date; to?: Date }
): Promise<InventoryReportType> {
    // Contar por estado
    const countByState = await prisma.motorcycle.groupBy({
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

    // Calcular valores por estado
    const valuesByState = await prisma.motorcycle.groupBy({
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
        _sum: {
            salePrice: true
        }
    });

    // Obtener motos por marca con sus nombres
    const motorcyclesByBrand = await prisma.motorcycle.findMany({
        where: {
            organizationId,
            ...(dateRange?.from && {
                createdAt: {
                    gte: dateRange.from,
                    ...(dateRange.to && { lte: dateRange.to })
                }
            })
        },
        include: {
            brand: true
        }
    });

    // Agrupar y contar por marca
    const brandCounts = motorcyclesByBrand.reduce<Record<string, BrandCount>>((acc: Record<string, BrandCount>, curr: MotorcycleWithBrand) => {
        if (!curr.brand) return acc;
        
        const brandId = curr.brand.id.toString();
        const brandName = curr.brand.name;
        
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
    const summary: InventoryReportType = {
        total: countByState.reduce((acc: number, curr: any) => acc + (curr._count ?? 0), 0),
        totalValue: valuesByState.reduce((acc: number, curr: any) => acc + (curr._sum?.salePrice ?? 0), 0),
        byState: countByState.map((state: any) => ({
            state: state.state,
            count: state._count ?? 0
        })),
        valueByState: valuesByState.map((state: any) => ({
            state: state.state,
            value: state._sum?.salePrice ?? 0
        })),
        byBrand: Object.values(brandCounts)
    };

    return summary;
} 