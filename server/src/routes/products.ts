import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, getCompanyContext } from '../lib/auth';

const router = Router();

// GET /api/products?catalogue_id=<uuid>
// List products for a catalogue; catalogue must belong to user's company unless super_admin.
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { catalogue_id } = req.query;
    if (!catalogue_id || typeof catalogue_id !== 'string') {
      res.status(400).json({ message: 'Query param catalogue_id is required.' });
      return;
    }

    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const catalogue = await prisma.catalogue.findUnique({
      where: { id: catalogue_id },
      select: { id: true, companyId: true },
    });
    if (!catalogue) {
      res.status(404).json({ message: 'Catalogue not found.' });
      return;
    }
    if (!isSuperAdmin && catalogue.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to list products for this catalogue.' });
      return;
    }

    const products = await prisma.product.findMany({
      where: { catalogueId: catalogue_id },
      orderBy: { pageNumber: 'asc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// POST /api/products – create product (catalogue must belong to user's company unless super_admin)
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      catalogue_id,
      page_number,
      product_name,
      image,
      description,
      x_coordinate,
      y_coordinate,
    } = req.body as {
      catalogue_id?: string;
      page_number?: number;
      product_name?: string;
      image?: string;
      description?: string;
      x_coordinate?: number;
      y_coordinate?: number;
    };

    if (!catalogue_id || typeof catalogue_id !== 'string') {
      res.status(400).json({ message: 'catalogue_id is required.' });
      return;
    }
    if (page_number === undefined || typeof page_number !== 'number') {
      res.status(400).json({ message: 'page_number is required.' });
      return;
    }
    if (!product_name || typeof product_name !== 'string' || !product_name.trim()) {
      res.status(400).json({ message: 'product_name is required.' });
      return;
    }
    if (!image || typeof image !== 'string' || !image.trim()) {
      res.status(400).json({ message: 'image is required.' });
      return;
    }
    if (description === undefined || typeof description !== 'string') {
      res.status(400).json({ message: 'description is required.' });
      return;
    }
    if (typeof x_coordinate !== 'number' || typeof y_coordinate !== 'number') {
      res.status(400).json({ message: 'x_coordinate and y_coordinate are required.' });
      return;
    }

    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const catalogue = await prisma.catalogue.findUnique({
      where: { id: catalogue_id },
      select: { id: true, companyId: true },
    });
    if (!catalogue) {
      res.status(404).json({ message: 'Catalogue not found.' });
      return;
    }
    if (!isSuperAdmin && catalogue.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to add products to this catalogue.' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        catalogueId: catalogue_id,
        pageNumber: page_number,
        productName: product_name.trim(),
        image: image.trim(),
        description,
        xCoordinate: x_coordinate,
        yCoordinate: y_coordinate,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/products/:id
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body as {
      page_number?: number;
      product_name?: string;
      image?: string;
      description?: string;
      x_coordinate?: number;
      y_coordinate?: number;
    };

    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { catalogue: true },
    });
    if (!existing) {
      res.status(404).json({ message: 'Product not found.' });
      return;
    }
    if (!isSuperAdmin && existing.catalogue.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to update this product.' });
      return;
    }

    const data: {
      pageNumber?: number;
      productName?: string;
      image?: string;
      description?: string;
      xCoordinate?: number;
      yCoordinate?: number;
    } = {};
    if (body.page_number !== undefined) data.pageNumber = body.page_number;
    if (body.product_name !== undefined) data.productName = body.product_name.trim();
    if (body.image !== undefined) data.image = body.image.trim();
    if (body.description !== undefined) data.description = body.description;
    if (body.x_coordinate !== undefined) data.xCoordinate = body.x_coordinate;
    if (body.y_coordinate !== undefined) data.yCoordinate = body.y_coordinate;

    const product = await prisma.product.update({
      where: { id },
      data,
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { catalogue: true },
    });
    if (!existing) {
      res.status(404).json({ message: 'Product not found.' });
      return;
    }
    if (!isSuperAdmin && existing.catalogue.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to delete this product.' });
      return;
    }
    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
