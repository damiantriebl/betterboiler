import { userOperations } from "@/lib/api/user-management";

// 🚀 API unificada para actualizar organización de usuario usando patrón Strategy
export const POST = userOperations.updateOrganization.handle.bind(
  userOperations.updateOrganization,
);
