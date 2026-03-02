const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {

  console.log("🌱 Seeding realistic multi-company tile data...")

  // 0️⃣ Companies
  const defaultCompanyId = '00000000-0000-0000-0000-000000000001'

  const company = await prisma.company.upsert({
    where: { id: defaultCompanyId },
    update: {},
    create: {
      id: defaultCompanyId,
      name: "Tileswale",
      logoUrl: "https://dummyimage.com/200x80/111827/f9fafb&text=Tileswale",
    }
  })

  console.log(`🏢 Using company: ${company.name}`)

  // 1️⃣ Types - single default type for this company
  const defaultTypeId = '00000000-0000-0000-0000-000000000002'
  const defaultType = await prisma.type.upsert({
    where: { id: defaultTypeId },
    update: {},
    create: {
      id: defaultTypeId,
      name: "Default Type",
      companyId: company.id,
    }
  })

  // 2️⃣ Sizes
  await prisma.size.createMany({
    skipDuplicates: true,
    data: [
      { name: "600x600",   typeId: defaultType.id },
      { name: "800x800",   typeId: defaultType.id },
      { name: "1200x1200", typeId: defaultType.id },
      { name: "600x1200",  typeId: defaultType.id },
      { name: "300x600",   typeId: defaultType.id },
      { name: "1600x3200", typeId: defaultType.id }
    ]
  })

  const allSizes = await prisma.size.findMany()

  // 3️⃣ Categories (fetched/created per catalogue below; ensure existing ones are reused)
  let categories = await prisma.category.findMany()

  // 4️⃣ Users
  const bcrypt = require('bcryptjs')
  const saltRounds = 10

  const superAdminPasswordHash = await bcrypt.hash("admin123", saltRounds)
  const normalUserPasswordHash = await bcrypt.hash("user123", saltRounds)

  await prisma.user.createMany({
    skipDuplicates: true,
    data: [
      {
        email: "admin@tileswale.com",
        password: superAdminPasswordHash,
        role: "super_admin"
      },
      {
        email: "company-admin@tileswale.com",
        password: superAdminPasswordHash,
        role: "company_admin",
        companyId: company.id
      },
      {
        email: "user@tileswale.com",
        password: normalUserPasswordHash,
        role: "user",
        companyId: company.id
      }
    ]
  })

  const normalUser = await prisma.user.findFirst({
    where: { role: "user" }
  })

  // 5️⃣ Catalogues
  const cataloguesData = [
    { title: "Italian Marble Collection 2026", size: "1200x1200", category: "Marble Look" },
    { title: "Royal Wood Series",              size: "600x1200",  category: "Wood Look" },
    { title: "Urban Concrete Vol-1",           size: "800x800",   category: "Concrete Series" },
    { title: "Premium High Gloss Book",        size: "1200x1200", category: "High Gloss Premium" },
    { title: "Outdoor Parking Tiles",          size: "600x600",   category: "Outdoor Parking" }
  ]

  for (const catData of cataloguesData) {

    const size     = allSizes.find(s => s.name === catData.size)
    let category = categories.find(c => c.name === catData.category)

    // Ensure category is linked to the correct size for the new hierarchy
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: catData.category,
          size: { connect: { id: size.id } }
        }
      })
      categories.push(category)
    } else if (!category.sizeId) {
      category = await prisma.category.update({
        where: { id: category.id },
        data: { size: { connect: { id: size.id } } }
      })
      categories = categories.map(c => c.id === category.id ? category : c)
    }

    // Skip if already seeded
    const existing = await prisma.catalogue.findFirst({ where: { title: catData.title } })
    if (existing) {
      console.log(`⏭️  Skipping "${catData.title}" (already seeded)`)
      continue
    }

    const catalogue = await prisma.catalogue.create({
      data: {
        title:      catData.title,
        sizeId:     size.id,
        categoryId: category.id,
        companyId:  company.id,
        pdfUrl:     `https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf`,
        coverImage: `https://dummyimage.com/400x600/cccccc/000&text=${catData.title.replace(/\s/g, '+')}`
      }
    })

    // 5️⃣ Products per Catalogue
    for (let i = 1; i <= 8; i++) {

      const product = await prisma.product.create({
        data: {
          catalogueId: catalogue.id,
          pageNumber:  Math.ceil(i / 2),
          productName: `${catData.category} Design ${i}`,
          image:       `https://dummyimage.com/600x600/eeeeee/000&text=Tile+${i}`,
          description: `Premium ${catData.category} tile with high durability and modern finish.`,
          xCoordinate: Math.random() * 500,
          yCoordinate: Math.random() * 700
        }
      })

      // Add some wishlist items
      if (i % 3 === 0) {
        await prisma.wishlist.create({
          data: {
            userId:    normalUser.id,
            productId: product.id
          }
        })
      }
    }

    console.log(`✅ Seeded "${catData.title}"`)
  }

  console.log("🔥 Realistic Tile Catalogue Data Seeded Successfully")
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })