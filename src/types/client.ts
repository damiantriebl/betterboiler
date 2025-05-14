export type ClientType = "Individual" | "LegalEntity";

export interface Client {
  id: string;
  type: ClientType;
  createdAt: Date;
  updatedAt: Date;
  firstName: string;
  lastName: string | null;
  companyName: string | null;
  taxId: string;
  email: string;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  status: string;
  notes: string | null;
  vatStatus: string | null;
}
