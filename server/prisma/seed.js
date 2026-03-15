const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'admin123';
const SAMPLE_PDF =
  'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';

async function main() {
  console.log('🌱 Seeding 3 companies, 1 super_admin, 3 company_admins, and full hierarchy...\n');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // ─── 1. Super Admin ─────────────────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@tileswale.com' },
    update: {},
    create: {
      email: 'superadmin@tileswale.com',
      password: passwordHash,
      role: 'super_admin',
    },
  });
  console.log('✅ Super admin: superadmin@tileswale.com');

  // ─── 2. Companies + Admins + Types/Sizes/Categories/Catalogues ──────────────
  const companiesConfig = [
    {
      name: 'Tileswale',
      logoUrl: 'https://dummyimage.com/200x80/111827/f9fafb&text=Tileswale',
      adminEmail: 'admin@tileswale.com',
      types: [
        { name: 'Wall Tiles', sizes: ['300x600', '600x600', '600x1200'] },
        { name: 'Floor Tiles', sizes: ['600x600', '800x800', '1200x1200'] },
      ],
      catalogues: [
        { title: 'Italian Marble Collection 2026', sizeName: '1200x1200', categoryName: 'Marble Look' },
        { title: 'Royal Wood Series', sizeName: '600x1200', categoryName: 'Wood Look' },
        { title: 'Urban Concrete Vol-1', sizeName: '800x800', categoryName: 'Concrete Series' },
      ],
    },
    {
      name: 'Ceramica Pro',
      logoUrl: 'https://dummyimage.com/200x80/1e3a5f/fff&text=Ceramica+Pro',
      adminEmail: 'admin@ceramicapro.com',
      types: [
        { name: 'Wall Tiles', sizes: ['300x600', '600x1200'] },
        { name: 'Floor Tiles', sizes: ['600x600', '800x800', '1200x1200'] },
      ],
      catalogues: [
        { title: 'Premium Gloss Collection', sizeName: '1200x1200', categoryName: 'High Gloss' },
        { title: 'Outdoor & Parking', sizeName: '600x600', categoryName: 'Outdoor Parking' },
      ],
    },
    {
      name: 'Stone World',
      logoUrl: 'https://dummyimage.com/200x80/3d2914/fff&text=Stone+World',
      adminEmail: 'admin@stoneworld.com',
      types: [
        { name: 'Natural Stone Look', sizes: ['600x600', '800x800', '1200x1200'] },
      ],
      catalogues: [
        { title: 'Natural Stone Look Book', sizeName: '1200x1200', categoryName: 'Marble Look' },
        { title: 'Slate & Quartz', sizeName: '800x800', categoryName: 'Slate Series' },
      ],
    },
  ];

  for (const config of companiesConfig) {
    const company = await prisma.company.create({
      data: {
        name: config.name,
        logoUrl: config.logoUrl,
      },
    });

    await prisma.user.upsert({
      where: { email: config.adminEmail },
      update: {},
      create: {
        email: config.adminEmail,
        password: passwordHash,
        role: 'company_admin',
        companyId: company.id,
      },
    });

    console.log(`\n🏢 ${company.name} → admin: ${config.adminEmail}`);

    const typeIds = {};
    const sizeNameToId = {};

    for (const typeConfig of config.types) {
      const type = await prisma.type.create({
        data: {
          name: typeConfig.name,
          companyId: company.id,
        },
      });
      typeIds[typeConfig.name] = type.id;

      for (const sizeName of typeConfig.sizes) {
        const size = await prisma.size.create({
          data: { name: sizeName, typeId: type.id },
        });
        sizeNameToId[sizeName] = size.id;
      }
    }

    for (const cat of config.catalogues) {
      const sizeId = sizeNameToId[cat.sizeName];
      if (!sizeId) {
        console.warn(`  ⚠️ Size "${cat.sizeName}" not found, skipping "${cat.title}"`);
        continue;
      }

      let category = await prisma.category.findFirst({
        where: { sizeId, name: cat.categoryName },
      });
      if (!category) {
        category = await prisma.category.create({
          data: { name: cat.categoryName, sizeId },
        });
      }

      const catalogue = await prisma.catalogue.create({
        data: {
          title: cat.title,
          sizeId,
          categoryId: category.id,
          companyId: company.id,
          pdfUrl: SAMPLE_PDF,
          coverImage: `https://dummyimage.com/400x600/cccccc/000&text=${encodeURIComponent(cat.title)}`,
        },
      });

      for (let i = 1; i <= 6; i++) {
        await prisma.product.create({
          data: {
            catalogueId: catalogue.id,
            pageNumber: Math.ceil(i / 2),
            productName: `${cat.categoryName} Design ${i}`,
            image: `https://dummyimage.com/600x600/eeeeee/000&text=Tile+${i}`,
            description: `Premium ${cat.categoryName} tile.`,
            xCoordinate: Math.random() * 500,
            yCoordinate: Math.random() * 700,
          },
        });
      }
      console.log(`  ✅ Catalogue: ${cat.title}`);
    }
  }

  console.log('\n🔥 Seed done.');
  console.log('   Super admin: superadmin@tileswale.com (sees all companies)');
  console.log('   Company admins: admin@tileswale.com, admin@ceramicapro.com, admin@stoneworld.com (see own company only)');
  console.log('   Password for all: admin123');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
