// ─── Shared API Types ─────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  logoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Type {
  id: string;
  name: string;
  companyId: string;
  company?: Company;
  createdAt?: string;
  updatedAt?: string;
}

export interface Size {
  id: string;
  name: string;
  typeId: string;
  type?: Type;
}

export interface Category {
  id: string;
  name: string;
  sizeId: string;
  size?: Size;
}

export interface Catalogue {
  id: string;
  title: string;
  sizeId: string;
  categoryId: string;
  companyId: string;
  pdfUrl: string;
  coverImage: string;
  size: Size;
  category: Category;
  company?: Company;
  createdAt: string;
  updatedAt: string;
}
