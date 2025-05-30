import { userOperations } from "@/lib/api/user-management";
// app/api/toggle-status/route.ts
import { NextResponse } from "next/server";

// 🚀 API unificada para cambiar estado de baneo usando patrón Strategy
export const POST = userOperations.toggleBanStatus.handle.bind(userOperations.toggleBanStatus);
