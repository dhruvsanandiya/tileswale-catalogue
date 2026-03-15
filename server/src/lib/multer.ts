import multer from 'multer';

const storage = multer.memoryStorage();

/** Max catalogue PDF size in bytes. Set CATALOGUE_PDF_MAX_SIZE_MB (default 500) to override. */
const CATALOGUE_PDF_MAX_BYTES =
  (typeof process.env.CATALOGUE_PDF_MAX_SIZE_MB !== 'undefined'
    ? Math.max(50, parseInt(process.env.CATALOGUE_PDF_MAX_SIZE_MB, 10) || 500)
    : 500) * 1024 * 1024;

const imageFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/avif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image type'));
  }
};

const pdfFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF allowed'));
  }
};

export const uploadCompanyLogo = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
}).single('logo');

export const uploadCatalogueFiles = multer({
  storage,
  limits: { fileSize: CATALOGUE_PDF_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'pdf') return pdfFilter(req, file, cb);
    if (file.fieldname === 'cover_image') return imageFilter(req, file, cb);
    cb(new Error('Unknown field'));
  },
}).fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'cover_image', maxCount: 1 },
]);

export const uploadCataloguePdfOnly = multer({
  storage,
  limits: { fileSize: CATALOGUE_PDF_MAX_BYTES },
  fileFilter: pdfFilter,
}).single('pdf');

export const uploadCatalogueCoverOnly = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single('cover_image');
