import { getInventoryStatusReport } from "@/actions/reports/get-inventory-report";
import type { UserWithRole } from "better-auth/plugins";

export type UserWithOrg = UserWithRole & { organizationId?: string };
