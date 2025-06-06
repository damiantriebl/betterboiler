import type { UserWithRole } from "better-auth/plugins";

export type UserWithOrg = UserWithRole & { organizationId?: string };
