<h1 align="center">
  <br />
  🪨 Tileswale Catalogue
  <br />
</h1>

<p align="center">
  <b>A modern digital tile catalogue with an immersive PDF flipbook viewer</b>
  <br />
  <sub>Browse tiles · Filter by size & category · Flip through catalogues like a real book</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Express.js-4-404d59?style=for-the-badge&logo=express" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2d3748?style=for-the-badge&logo=prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-DB-336791?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ed?style=for-the-badge&logo=docker" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-38bdf8?style=for-the-badge&logo=tailwindcss" />
</p>

---

## ✨ What is Tileswale Catalogue?

**Tileswale Catalogue** is a full-stack web application that lets tile businesses and customers browse tile catalogues online — just like flipping through a physical booklet, but better. Built as a production-ready **monorepo** with a Next.js 14 frontend and an Express + Prisma backend.

---

## 🚀 Features

| Feature                    | Description                                                     |
| -------------------------- | --------------------------------------------------------------- |
| 📖 **PDF Flipbook Viewer** | Real page-flip animation powered by `pdf.js` + `react-pageflip` |
| 🗂️ **Category Browsing**   | Filter catalogues by tile category                              |
| 📐 **Size Filtering**      | Browse catalogues by tile size                                  |
| 📦 **Catalogue Listing**   | Dynamic catalogue pages fetched from the backend                |
| 🔐 **JWT Auth**            | Role-based authentication (admin / user)                        |
| ❤️ **Wishlist**            | Users can save their favourite tile products                    |
| 🐳 **Docker Compose**      | One-command spin-up for both services + PostgreSQL              |
| ⚡ **Lazy Loading**        | PDFs load page-by-page for fast performance                     |
| 🖥️ **Fullscreen Mode**     | Immersive fullscreen flipbook experience                        |

---

## 🏗️ Project Structure

```
tileswale-catalogue/          ← Monorepo root (npm workspaces)
├── client/                   ← Next.js 14 App Router frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx              ← Home / size selection
│       │   ├── layout.tsx
│       │   ├── globals.css
│       │   ├── error.tsx
│       │   ├── fonts/
│       │   ├── category/                 ← Category listing (page, error)
│       │   ├── catalogues/               ← Catalogue grid (page, error)
│       │   └── flipbook/[catalogueId]/   ← FlipbookViewer, PdfPageRenderer, ThumbnailPanel
│       ├── components/                   ← SkeletonCard etc.
│       ├── lib/api.ts                    ← API client
│       └── types/                        ← TypeScript types
├── server/                   ← Express.js + Prisma backend
│   ├── src/
│   │   ├── index.ts          ← Server entry point
│   │   ├── lib/prisma.ts     ← Prisma client
│   │   └── routes/           ← catalogues, categories, sizes
│   └── prisma/
│       ├── schema.prisma     ← Database schema
│       ├── migrations/       ← DB migrations
│       └── seed.js           ← Seed data
├── docker-compose.yml        ← Orchestrates client + server + postgres
└── .gitignore
```

---

## 🗄️ Database Schema

```
Size ──────────────── Catalogue ──────────── Product ──── Wishlist
                           │                                  │
                       Category                             User
```

| Model       | Purpose                                              |
| ----------- | ---------------------------------------------------- |
| `Size`      | Tile size variants (e.g. 60×60, 30×90)               |
| `Category`  | Tile categories (e.g. Floor, Wall, Outdoor)          |
| `Catalogue` | A PDF catalogue linked to a size & category          |
| `Product`   | Individual tiles inside a catalogue with coordinates |
| `User`      | Registered users with admin/user roles               |
| `Wishlist`  | Saved products per user                              |

---

## 🛠️ Tech Stack

### Frontend — `client/`

- **Next.js 14** (App Router, React Server Components)
- **TypeScript 5**
- **Tailwind CSS 3**
- **pdf.js** — PDF rendering
- **react-pageflip** — Book-style flip animations

### Backend — `server/`

- **Express.js 4**
- **TypeScript 5**
- **Prisma 5** + **PostgreSQL** — ORM & database
- **bcryptjs** — Password hashing
- **jsonwebtoken** — JWT authentication
- **CORS** middleware

### DevOps

- **Docker + Docker Compose** — containerised services
- **npm Workspaces** — monorepo management
- **concurrently** — run client & server simultaneously

---

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (recommended)
- PostgreSQL (if running locally without Docker)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/tileswale-catalogue.git
cd tileswale-catalogue
```

### 2. Setup environment variables

```bash
# Root
cp .env.example .env

# Client
cp client/.env.local.example client/.env.local

# Server
cp server/.env.example server/.env
# → Set DATABASE_URL, JWT_SECRET inside server/.env
```

### 3a. Run with Docker (Recommended)

```bash
docker compose up --build
```

> Services will be available at:
>
> - **Frontend** → http://localhost:3000
> - **Backend API** → http://localhost:5000

### 3b. Run locally (without Docker)

```bash
# Install all dependencies
npm install

# Run migrations & seed the database
cd server
npx prisma migrate dev
node prisma/seed.js
cd ..

# Start both client and server
npm run dev
```

---

## 📡 API Endpoints

| Method | Endpoint                              | Description                            |
| ------ | ------------------------------------- | -------------------------------------- |
| `GET`  | `/api/sizes`                          | List all tile sizes                    |
| `GET`  | `/api/categories?sizeId=`             | Categories filtered by size            |
| `GET`  | `/api/catalogues?sizeId=&categoryId=` | Catalogues filtered by size & category |

---

## 📁 Environment Variables

### `server/.env`

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tileswale
JWT_SECRET=your_jwt_secret
PORT=5000
```

### `client/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🗺️ Roadmap

- [x] Monorepo setup with Docker Compose
- [x] Database schema with Prisma
- [x] REST API — sizes, categories, catalogues
- [x] Home page with size selection
- [x] Category browsing page
- [x] Catalogue listing page
- [x] PDF Flipbook viewer with page-flip animation
- [x] Fullscreen & zoom controls
- [x] Lazy-loaded PDF pages
- [ ] JWT Authentication (login / register)
- [ ] Wishlist functionality
- [ ] Product hotspots on flipbook pages
- [ ] Admin dashboard for catalogue management

---

## 📄 License

[MIT](./LICENSE) © 2024 Tileswale
