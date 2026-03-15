import path from 'path';
import fs from 'fs';
import type { Request } from 'express';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif',
]);
const PDF_EXTENSION = 'pdf';

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getExt(mimetype: string, originalName?: string): string {
  if (originalName) {
    const ext = path.extname(originalName).slice(1).toLowerCase();
    if (ext) return ext;
  }
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
  };
  return map[mimetype] ?? 'bin';
}

function writeFile(file: Express.Multer.File, destPath: string): void {
  const buf = file.buffer ?? ((file as any).path && fs.existsSync((file as any).path) ? fs.readFileSync((file as any).path) : undefined);
  if (!buf || buf.length === 0) {
    throw new Error('No file data');
  }
  ensureDir(path.dirname(destPath));
  fs.writeFileSync(destPath, buf);
}

/** Save company logo; returns relative URL path e.g. /uploads/companies/:id/logo.png */
export function saveCompanyLogo(companyId: string, file: Express.Multer.File): string {
  const ext = getExt(file.mimetype, file.originalname);
  if (!IMAGE_EXTENSIONS.has(ext)) {
    throw new Error('Invalid image format. Use jpg, png, gif, webp, etc.');
  }
  const dir = path.join(UPLOAD_DIR, 'companies', companyId);
  const filename = `logo.${ext}`;
  const filepath = path.join(dir, filename);
  writeFile(file, filepath);
  return `/uploads/companies/${companyId}/${filename}`;
}

/** Save catalogue PDF; returns relative URL path */
export function saveCataloguePdf(catalogueId: string, file: Express.Multer.File): string {
  const ext = getExt(file.mimetype, file.originalname);
  if (ext !== PDF_EXTENSION) {
    throw new Error('Only PDF files are allowed.');
  }
  const dir = path.join(UPLOAD_DIR, 'catalogues', catalogueId);
  const filename = 'catalogue.pdf';
  const filepath = path.join(dir, filename);
  writeFile(file, filepath);
  return `/uploads/catalogues/${catalogueId}/${filename}`;
}

/** Save catalogue cover image; returns relative URL path */
export function saveCatalogueCover(catalogueId: string, file: Express.Multer.File): string {
  const ext = getExt(file.mimetype, file.originalname);
  if (!IMAGE_EXTENSIONS.has(ext)) {
    throw new Error('Invalid image format for cover.');
  }
  const dir = path.join(UPLOAD_DIR, 'catalogues', catalogueId);
  const filename = `cover.${ext}`;
  const filepath = path.join(dir, filename);
  writeFile(file, filepath);
  return `/uploads/catalogues/${catalogueId}/${filename}`;
}

/** Get optional file from request (multer adds to req.file or req.files) */
export function getFile(req: Request, field: string): Express.Multer.File | undefined {
  const files = (req as any).files as Record<string, Express.Multer.File | Express.Multer.File[]>;
  if (files && files[field]) {
    const v = files[field];
    return Array.isArray(v) ? v[0] : v;
  }
  return (req as any).file;
}

export function getFiles(req: Request): Record<string, Express.Multer.File> {
  const files = (req as any).files as Record<string, Express.Multer.File | Express.Multer.File[]>;
  if (!files) return {};
  const out: Record<string, Express.Multer.File> = {};
  for (const key of Object.keys(files)) {
    const v = files[key];
    out[key] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}
