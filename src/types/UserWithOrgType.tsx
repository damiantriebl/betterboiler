import type { UserWithRole } from "better-auth/plugins";
import { getInventoryStatusReport } from "@/actions/reports/get-inventory-report";

export type UserWithOrg = UserWithRole & { organizationId?: string };
