export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId?: string | null;
  createdAt: string;
  updatedAt: string;
};
