import { userOperations } from "@/lib/api/user-management";
// app/api/delete-user/route.ts
import { NextResponse } from "next/server";

// 🚀 API unificada para eliminar usuario usando patrón Strategy
export const POST = userOperations.deleteUser.handle.bind(userOperations.deleteUser);
