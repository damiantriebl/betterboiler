import { userOperations } from "@/lib/api/user-management";
// app/api/toggle-status/route.ts
import { NextResponse } from "next/server";

// 🚀 API unificada para cambiar rol de usuario usando patrón Strategy
export const POST = userOperations.updateOrganization.handle.bind(
  userOperations.updateOrganization,
);
