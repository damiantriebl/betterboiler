import { NextRequest, NextResponse } from "next/server";
import { getCacheStats } from "@/lib/api-optimizer";

// 🚀 API PARA ESTADÍSTICAS DE CACHE (SOLO DESARROLLO/DEBUG)
export async function GET(req: NextRequest) {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  try {
    const stats = getCacheStats();
    
    return NextResponse.json({
      cache: stats,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('[CACHE_STATS]', error);
    return NextResponse.json(
      { error: 'Error getting cache stats' },
      { status: 500 }
    );
  }
} 