import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { requireAuth, getCompanyContext } from '../lib/auth';
import { uploadCatalogueFiles } from '../lib/multer';
import { saveCataloguePdf, saveCatalogueCover, getFile } from '../lib/upload';

const router = Router();

// GET /api/catalogues?size_id=<uuid>&category_id=<uuid>
// Returns catalogues matching both filters, with size and category included
// and scoped by company where applicable.
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { size_id, category_id } = req.query;

    if (!size_id || typeof size_id !== 'string') {
      res.status(400).json({ message: 'Query param size_id is required.' });
      return;
    }

    if (!category_id || typeof category_id !== 'string') {
      res.status(400).json({ message: 'Query param category_id is required.' });
      return;
    }

    const { companyId, isSuperAdmin } = getCompanyContext(req);

    if (!isSuperAdmin && !companyId) {
      res.status(403).json({ message: 'Company context required.' });
      return;
    }

    const where: Prisma.CatalogueWhereInput = {
      sizeId: size_id,
      categoryId: category_id,
    };

    if (!isSuperAdmin) {
      where.companyId = companyId!;
    }

    const catalogues = await prisma.catalogue.findMany({
      where,
      include: {
        size: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { title: 'asc' },
    });

    res.json(catalogues);
  } catch (err) {
    next(err);
  }
});

// GET /api/catalogues/:id
// Returns a single catalogue by ID, with size and category included
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { companyId, isSuperAdmin } = getCompanyContext(req);

    if (!isSuperAdmin && !companyId) {
      res.status(403).json({ message: 'Company context required.' });
      return;
    }

    const where: Prisma.CatalogueWhereInput = { id };
    if (!isSuperAdmin) {
      where.companyId = companyId!;
    }

    const catalogue = await prisma.catalogue.findFirst({
      where,
      include: {
        size: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    if (!catalogue) {
      res.status(404).json({ message: 'Catalogue not found.' });
      return;
    }

    res.json(catalogue);
  } catch (err) {
    next(err);
  }
});

// POST /api/catalogues – create catalogue. Accepts JSON (pdf_url, cover_image) or multipart (pdf, cover_image files).
router.post(
  '/',
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      return uploadCatalogueFiles(req, res, next);
    }
    next();
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as Record<string, string>;
      const title = body?.title;
      const size_id = body?.size_id;
      const category_id = body?.category_id;
      const company_id = body?.company_id;
      const pdf_url = body?.pdf_url;
      const cover_image = body?.cover_image;

      const pdfFile = getFile(req, 'pdf');
      const coverFile = getFile(req, 'cover_image');

      const hasPdfUrl = typeof pdf_url === 'string' && pdf_url.trim();
      const hasCoverUrl = typeof cover_image === 'string' && cover_image.trim();
      if (!title || typeof title !== 'string' || !title.trim()) {
        res.status(400).json({ message: 'Title is required.' });
        return;
      }
      if (!size_id || typeof size_id !== 'string') {
        res.status(400).json({ message: 'size_id is required.' });
        return;
      }
      if (!category_id || typeof category_id !== 'string') {
        res.status(400).json({ message: 'category_id is required.' });
        return;
      }
      if (!pdfFile && !hasPdfUrl) {
        res.status(400).json({ message: 'pdf_url or pdf file is required.' });
        return;
      }
      if (!coverFile && !hasCoverUrl) {
        res.status(400).json({ message: 'cover_image or cover_image file is required.' });
        return;
      }

      const { companyId, isSuperAdmin } = getCompanyContext(req);
      const targetCompanyId =
        company_id && typeof company_id === 'string' ? company_id : companyId;
      if (!targetCompanyId) {
        res.status(400).json({ message: 'Company is required.' });
        return;
      }
      if (!isSuperAdmin && companyId !== targetCompanyId) {
        res.status(403).json({ message: 'Company context does not match.' });
        return;
      }

      const [sizeRow, categoryRow] = await Promise.all([
        prisma.size.findUnique({
          where: { id: size_id },
          include: { type: true },
        }),
        prisma.category.findUnique({ where: { id: category_id } }),
      ]);
      if (!sizeRow || !categoryRow) {
        res.status(400).json({ message: 'Size or category not found.' });
        return;
      }
      if (sizeRow.id !== categoryRow.sizeId) {
        res.status(400).json({ message: 'Category must belong to the selected size.' });
        return;
      }
      if (sizeRow.type.companyId !== targetCompanyId) {
        res.status(400).json({ message: 'Size must belong to the selected company.' });
        return;
      }

      const initialPdfUrl = pdfFile ? '/pending' : pdf_url!.trim();
      const initialCover = coverFile ? '/pending' : cover_image!.trim();

      const catalogue = await prisma.catalogue.create({
        data: {
          title: title.trim(),
          sizeId: size_id,
          categoryId: category_id,
          companyId: targetCompanyId,
          pdfUrl: initialPdfUrl,
          coverImage: initialCover,
        },
        include: {
          size: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          company: { select: { id: true, name: true, logoUrl: true } },
        },
      });

      if (pdfFile || coverFile) {
        const updates: { pdfUrl?: string; coverImage?: string } = {};
        if (pdfFile) {
          updates.pdfUrl = saveCataloguePdf(catalogue.id, pdfFile);
        }
        if (coverFile) {
          updates.coverImage = saveCatalogueCover(catalogue.id, coverFile);
        }
        const updated = await prisma.catalogue.update({
          where: { id: catalogue.id },
          data: updates,
          include: {
            size: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            company: { select: { id: true, name: true, logoUrl: true } },
          },
        });
        return res.status(201).json(updated);
      }
      res.status(201).json(catalogue);
    } catch (err: any) {
      if (err.message?.includes('Only PDF') || err.message?.includes('Invalid image')) {
        res.status(400).json({ message: err.message });
        return;
      }
      next(err);
    }
  }
);

// PATCH /api/catalogues/:id – accepts JSON or multipart (optional pdf, cover_image files).
router.patch(
  '/:id',
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      return uploadCatalogueFiles(req, res, next);
    }
    next();
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const body = req.body as Record<string, string>;
      const pdfFile = getFile(req, 'pdf');
      const coverFile = getFile(req, 'cover_image');

      const { companyId, isSuperAdmin } = getCompanyContext(req);
      const existing = await prisma.catalogue.findFirst({
        where: { id },
        include: { size: { include: { type: true } } },
      });
      if (!existing) {
        res.status(404).json({ message: 'Catalogue not found.' });
        return;
      }
      if (!isSuperAdmin && existing.companyId !== companyId) {
        res.status(403).json({ message: 'Not allowed to update this catalogue.' });
        return;
      }

      const data: {
        title?: string;
        pdfUrl?: string;
        coverImage?: string;
        sizeId?: string;
        categoryId?: string;
      } = {};
      if (body.title !== undefined) {
        if (typeof body.title !== 'string' || !body.title.trim()) {
          res.status(400).json({ message: 'Title cannot be empty.' });
          return;
        }
        data.title = body.title.trim();
      }
      if (pdfFile) {
        data.pdfUrl = saveCataloguePdf(id, pdfFile);
      } else if (body.pdf_url !== undefined) {
        data.pdfUrl = typeof body.pdf_url === 'string' ? body.pdf_url.trim() : existing.pdfUrl;
      }
      if (coverFile) {
        data.coverImage = saveCatalogueCover(id, coverFile);
      } else if (body.cover_image !== undefined) {
        data.coverImage =
          typeof body.cover_image === 'string' ? body.cover_image.trim() : existing.coverImage;
      }
      if (body.size_id !== undefined && body.category_id !== undefined) {
        const [sizeRow, categoryRow] = await Promise.all([
          prisma.size.findUnique({
            where: { id: body.size_id },
            include: { type: true },
          }),
          prisma.category.findUnique({ where: { id: body.category_id } }),
        ]);
        if (!sizeRow || !categoryRow || sizeRow.id !== categoryRow.sizeId) {
          res.status(400).json({ message: 'Invalid size_id or category_id.' });
          return;
        }
        if (sizeRow.type.companyId !== existing.companyId) {
          res.status(400).json({ message: 'Size must belong to the catalogue company.' });
          return;
        }
        data.sizeId = body.size_id;
        data.categoryId = body.category_id;
      }

      if (Object.keys(data).length === 0) {
        const catalogue = await prisma.catalogue.findFirst({
          where: { id },
          include: {
            size: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            company: { select: { id: true, name: true, logoUrl: true } },
          },
        });
        return res.json(catalogue!);
      }

      const catalogue = await prisma.catalogue.update({
        where: { id },
        data,
        include: {
          size: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          company: { select: { id: true, name: true, logoUrl: true } },
        },
      });
      res.json(catalogue);
    } catch (err: any) {
      if (err.message?.includes('Only PDF') || err.message?.includes('Invalid image')) {
        res.status(400).json({ message: err.message });
        return;
      }
      next(err);
    }
  }
);

// DELETE /api/catalogues/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const existing = await prisma.catalogue.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Catalogue not found.' });
      return;
    }
    if (!isSuperAdmin && existing.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to delete this catalogue.' });
      return;
    }
    await prisma.catalogue.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
