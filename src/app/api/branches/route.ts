import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrganizationIdFromSession } from "@/actions/util";
import { withPerformanceOptimization, optimizedJsonResponse } from "@/lib/api-optimizer";
import { CACHE_TTL } from "@/lib/response-cache";

async function getBranchesHandler(req: NextRequest) {
  try {
    const session = await getOrganizationIdFromSession();
    if (session.error || !session.organizationId) {
      return NextResponse.json(
        { error: session.error || "Organización no encontrada" },
        { status: 401 },
      );
    }

    // 🚀 QUERY OPTIMIZADA CON SELECCIÓN ESPECÍFICA
    const branches = await prisma.branch.findMany({
      where: {
        organizationId: session.organizationId,
      },
      select: {
        id: true,
        name: true,
        order: true,
        organizationId: true,
        // Solo campos necesarios para reducir payload
      },
      orderBy: {
        order: "asc",
      },
    });

    // 🚀 RESPUESTA OPTIMIZADA
    return optimizedJsonResponse(branches, {
      cache: true,
      compress: true,
    });
  } catch (error) {
    console.error("[BRANCHES_GET]", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor al obtener sucursales",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// 🚀 APLICAR OPTIMIZACIONES DE THROUGHPUT
export const GET = withPerformanceOptimization(getBranchesHandler, {
  cache: true,
  cacheType: 'STATIC_DATA', // Branches cambian poco
  cacheTTL: CACHE_TTL.STATIC_DATA, // 30 minutos
});

// 🚀 POST OPTIMIZADO PARA CREAR/ACTUALIZAR BRANCHES
async function postBranchesHandler(req: NextRequest) {
  try {
    const session = await getOrganizationIdFromSession();
    if (session.error || !session.organizationId) {
      return NextResponse.json(
        { error: session.error || "Organización no encontrada" },
        { status: 401 },
      );
    }

    const body = await req.json();
    
    // Validación rápida
    if (!body.name) {
      return NextResponse.json(
        { error: "Nombre es requerido" },
        { status: 400 },
      );
    }

    // 🚀 TRANSACCIÓN OPTIMIZADA
    const branch = await prisma.branch.create({
      data: {
        ...body,
        organizationId: session.organizationId,
      },
      select: {
        id: true,
        name: true,
        order: true,
        organizationId: true,
      },
    });

    // 🚀 INVALIDAR CACHE RELACIONADO
    const { invalidateRelatedCache } = await import("@/lib/api-optimizer");
    invalidateRelatedCache([`GET:/api/branches:org:${session.organizationId}`]);

    return optimizedJsonResponse(branch, {
      status: 201,
      cache: false,
    });
  } catch (error) {
    console.error("[BRANCHES_POST]", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor al crear sucursal",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export const POST = withPerformanceOptimization(postBranchesHandler, {
  cache: false, // No cache para mutations
});
