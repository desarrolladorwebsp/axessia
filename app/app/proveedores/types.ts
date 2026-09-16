export type SupplierRecord = {
  id: string;
  name: string;
  identifier: string | null;
  phone: string | null;
  contactName: string | null;
  email: string | null;
  manufacturer: string | null;
  originCountry: string | null;
  country: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SuppliersResponse = {
  suppliers: SupplierRecord[];
  summary: {
    total: number;
    withEmail: number;
    withPhone: number;
    withIdentifier: number;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};
