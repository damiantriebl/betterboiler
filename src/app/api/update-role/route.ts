import { userOperations } from "@/lib/api/user-management";

// Handle POST requests for updating user roles
export const POST = userOperations.updateRole.handle.bind(userOperations.updateRole);
