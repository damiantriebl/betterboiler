import type { Organization } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  organization?: Organization | null;
}

export interface Session {
  user: SessionUser;
  expires: string;
}
