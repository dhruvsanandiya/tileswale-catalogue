// ─── Shared API Types ─────────────────────────────────────────────────────────

export interface Size {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Catalogue {
  id: string;
  title: string;
  sizeId: string;
  categoryId: string;
  pdfUrl: string;
  coverImage: string;
  size: Size;
  category: Category;
  createdAt: string;
  updatedAt: string;
}
