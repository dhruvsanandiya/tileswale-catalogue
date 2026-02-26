<div align="center">

# 🪨 Tileswale Catalogue

**A modern digital tile catalogue with an immersive PDF flipbook viewer**

*Browse tiles · Filter by size & category · Flip through catalogues like a real book*

<br />

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express.js-4-404d59?style=flat-square&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2d3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-DB-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker_Compose-Ready-2496ed?style=flat-square&logo=docker)](https://www.docker.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

<br />

[Features](#-features) • [Quick Start](#-quick-start) • [API](#-api-endpoints) • [Roadmap](#-roadmap)

</div>

---

## 📖 Table of Contents

- [About](#-what-is-tileswale-catalogue)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Endpoints](#-api-endpoints)
- [Environment Variables](#-environment-variables)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## ✨ What is Tileswale Catalogue?

**Tileswale Catalogue** is a full-stack web application for tile businesses and customers to browse catalogues online. It combines a sleek Next.js 14 frontend with an Express + Prisma backend, delivered as a production-ready monorepo.

| | |
|---|---|
| 📖 **Flipbook UX** | Real page-flip animations powered by `pdf.js` + `react-pageflip` |
| 🗂️ **Smart Filtering** | Filter by tile size and category for quick discovery |
| ⚡ **Fast** | Lazy-loaded PDF pages and optimised rendering |
| 🐳 **One-command deploy** | Docker Compose spins up everything — client, server, PostgreSQL |

---

## 🚀 Features

| Feature | Description |
| :---: | --- |
| 📖 **PDF Flipbook** | Immersive page-flip animation with `pdf.js` + `react-pageflip` |
| 🗂️ **Category Browsing** | Filter catalogues by tile category |
| 📐 **Size Filtering** | Browse by tile size (e.g. 60×60, 30×90) |
| 📦 **Catalogue Listing** | Dynamic grid fetched from the backend |
| 🖥️ **Fullscreen Mode** | Immersive fullscreen flipbook experience |
| ⚡ **Lazy Loading** | PDFs load page-by-page for fast performance |
| 🔐 **JWT Auth** *(planned)* | Role-based auth (admin / user) |
| ❤️ **Wishlist** *(planned)* | Save favourite tile products |
| 🐳 **Docker Compose** | One command to run client + server + PostgreSQL |

---

## 🏗️ Project Structure

```
tileswale-catalogue/
├── client/                    # Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Home / size selection
│       │   ├── layout.tsx
│       │   ├── category/          # Category listing
│       │   ├── catalogues/        # Catalogue grid
│       │   └── flipbook/[id]/     # PDF flipbook viewer
│       ├── components/
│       ├── lib/                   # API client
│       └── types/
├── server/                    # Express + Prisma
│   ├── src/
│   │   ├── index.ts
│   │   ├── lib/prisma.ts
│   │   └── routes/               # catalogues, categories, sizes
│   └── prisma/
│       ├── schema.prisma
│       ├── migrations/
│       └── seed.js
├── docker-compose.yml
└── .gitignore
```

### Database Schema

```
Size ──────── Catalogue ──────── Product ──── Wishlist
                     │                            │
                 Category                       User
```

| Model | Purpose |
| --- | --- |
| `Size` | Tile size variants (60×60, 30×90, etc.) |
| `Category` | Categories (Floor, Wall, Outdoor) |
| `Catalogue` | PDF catalogue linked to size & category |
| `Product` | Tiles inside catalogues with coordinates |
| `User` | Registered users with roles |
| `Wishlist` | Saved products per user |

---

## 🛠️ Tech Stack

<table>
<tr>
<td width="50%">

**Frontend** (`client/`)

- Next.js 14 (App Router)
- TypeScript 5
- Tailwind CSS 3
- pdf.js · react-pageflip

</td>
<td width="50%">

**Backend** (`server/`)

- Express.js 4
- Prisma 5 + PostgreSQL
- bcryptjs · jsonwebtoken
- CORS middleware

</td>
</tr>
</table>

**DevOps:** Docker Compose · npm Workspaces · concurrently

---

## ⚡ Quick Start

### Option A — Docker (recommended)

```bash
git clone https://github.com/your-username/tileswale-catalogue.git
cd tileswale-catalogue
docker compose up --build
```

→ **Frontend:** http://localhost:3000 · **API:** http://localhost:5000

### Option B — Local development

```bash
git clone https://github.com/your-username/tileswale-catalogue.git
cd tileswale-catalogue
npm install

# Setup database
cd server
npx prisma migrate dev
node prisma/seed.js
cd ..

# Run client + server
npm run dev
```

### Prerequisites

- Node.js 18+
- Docker & Docker Compose *(or PostgreSQL if running locally)*

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/sizes` | List all tile sizes |
| `GET` | `/api/categories?sizeId=` | Categories filtered by size |
| `GET` | `/api/catalogues?sizeId=&categoryId=` | Catalogues filtered by size & category |

---

## 📁 Environment Variables

<details>
<summary><b>server/.env</b></summary>

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tileswale
JWT_SECRET=your_jwt_secret
PORT=5000
```

</details>

<details>
<summary><b>client/.env.local</b></summary>

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

</details>

---

## 🗺️ Roadmap

- [x] Monorepo + Docker Compose
- [x] Prisma schema & migrations
- [x] REST API (sizes, categories, catalogues)
- [x] Home, category, catalogue pages
- [x] PDF flipbook with page-flip
- [x] Fullscreen & zoom
- [x] Lazy-loaded PDF pages
- [ ] JWT authentication
- [ ] Wishlist
- [ ] Product hotspots on flipbook
- [ ] Admin dashboard

---

## 📄 License

[MIT](./LICENSE) © 2025 Tileswale
