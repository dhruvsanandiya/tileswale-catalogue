const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {

  console.log("🌱 Seeding realistic tile data...")

  // 1️⃣ Sizes
  await prisma.size.createMany({
    skipDuplicates: true,
    data: [
      { name: "600x600" },
      { name: "800x800" },
      { name: "1200x1200" },
      { name: "600x1200" },
      { name: "300x600" },
      { name: "1600x3200" }
    ]
  })

  const allSizes = await prisma.size.findMany()

  // 2️⃣ Categories
  await prisma.category.createMany({
    skipDuplicates: true,
    data: [
      { name: "Marble Look" },
      { name: "Wood Look" },
      { name: "Stone Finish" },
      { name: "Concrete Series" },
      { name: "High Gloss Premium" },
      { name: "Outdoor Parking" }
    ]
  })

  const categories = await prisma.category.findMany()

  // 3️⃣ Users
  await prisma.user.createMany({
    skipDuplicates: true,
    data: [
      {
        email: "admin@tileswale.com",
        password: "admin123",
        role: "admin"
      },
      {
        email: "user@tileswale.com",
        password: "user123",
        role: "user"
      }
    ]
  })

  const normalUser = await prisma.user.findFirst({
    where: { role: "user" }
  })

  // 4️⃣ Catalogues
  const cataloguesData = [
    { title: "Italian Marble Collection 2026", size: "1200x1200", category: "Marble Look" },
    { title: "Royal Wood Series",              size: "600x1200",  category: "Wood Look" },
    { title: "Urban Concrete Vol-1",           size: "800x800",   category: "Concrete Series" },
    { title: "Premium High Gloss Book",        size: "1200x1200", category: "High Gloss Premium" },
    { title: "Outdoor Parking Tiles",          size: "600x600",   category: "Outdoor Parking" }
  ]

  for (const catData of cataloguesData) {

    const size     = allSizes.find(s => s.name === catData.size)
    const category = categories.find(c => c.name === catData.category)

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