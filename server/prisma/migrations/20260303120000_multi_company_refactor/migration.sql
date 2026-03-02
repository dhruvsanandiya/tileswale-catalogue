-- Multi-company refactor migration

-- 1) Update Role enum to new values

-- Rename existing 'admin' role to 'super_admin'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    BEGIN
      ALTER TYPE "Role" RENAME VALUE 'admin' TO 'super_admin';
    EXCEPTION
      WHEN duplicate_object THEN
        -- Value was already renamed, ignore
        NULL;
    END;
  END IF;
END$$;

-- Add company_admin role if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'Role' AND e.enumlabel = 'company_admin') THEN
    ALTER TYPE "Role" ADD VALUE 'company_admin';
  END IF;
END$$;

-- 2) Create companies table

CREATE TABLE IF NOT EXISTS "companies" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "logo_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- 3) Create types table

CREATE TABLE IF NOT EXISTS "types" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "types_pkey" PRIMARY KEY ("id")
);

-- 4) Seed a default company and type for existing data

-- Use fixed IDs so application code and future migrations can rely on them if needed
INSERT INTO "companies" ("id", "name", "logo_url", "created_at", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Company', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "types" ("id", "name", "company_id", "created_at", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000002', 'Default Type', '00000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- 5) Wire types to companies

ALTER TABLE "types"
ADD CONSTRAINT "types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6) Evolve sizes: add type_id, drop old unique, add new composite unique + FK

ALTER TABLE "sizes"
ADD COLUMN IF NOT EXISTS "type_id" TEXT;

-- Backfill existing sizes to use the default type
UPDATE "sizes"
SET "type_id" = '00000000-0000-0000-0000-000000000002'
WHERE "type_id" IS NULL;

-- Make type_id required
ALTER TABLE "sizes"
ALTER COLUMN "type_id" SET NOT NULL;

-- Drop old unique constraint on name (now scoped per type)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'sizes_name_key'
  ) THEN
    DROP INDEX "sizes_name_key";
  END IF;
END$$;

-- Add new unique constraint on (type_id, name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'sizes_type_id_name_key'
  ) THEN
    CREATE UNIQUE INDEX "sizes_type_id_name_key" ON "sizes"("type_id", "name");
  END IF;
END$$;

-- Add FK from sizes.type_id to types.id
ALTER TABLE "sizes"
ADD CONSTRAINT "sizes_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7) Evolve categories: add size_id, drop old unique, add new composite unique + FK

ALTER TABLE "categories"
ADD COLUMN IF NOT EXISTS "size_id" TEXT;

-- Backfill categories.size_id:
-- Prefer the size_id of any existing catalogue for that category; if none, fall back to the first size.
UPDATE "categories" c
SET "size_id" = COALESCE(
  (SELECT "size_id" FROM "catalogues" cat WHERE cat."category_id" = c."id" LIMIT 1),
  (SELECT "id" FROM "sizes" ORDER BY "created_at" ASC LIMIT 1)
)
WHERE "size_id" IS NULL;

-- Make size_id required
ALTER TABLE "categories"
ALTER COLUMN "size_id" SET NOT NULL;

-- Drop old unique constraint on name (now scoped per size)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'categories_name_key'
  ) THEN
    DROP INDEX "categories_name_key";
  END IF;
END$$;

-- Add new unique constraint on (size_id, name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'categories_size_id_name_key'
  ) THEN
    CREATE UNIQUE INDEX "categories_size_id_name_key" ON "categories"("size_id", "name");
  END IF;
END$$;

-- Add FK from categories.size_id to sizes.id
ALTER TABLE "categories"
ADD CONSTRAINT "categories_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8) Evolve catalogues: add company_id and hook to companies

ALTER TABLE "catalogues"
ADD COLUMN IF NOT EXISTS "company_id" TEXT;

-- Backfill existing catalogues to the default company
UPDATE "catalogues"
SET "company_id" = '00000000-0000-0000-0000-000000000001'
WHERE "company_id" IS NULL;

-- Make company_id required
ALTER TABLE "catalogues"
ALTER COLUMN "company_id" SET NOT NULL;

-- Add FK from catalogues.company_id to companies.id
ALTER TABLE "catalogues"
ADD CONSTRAINT "catalogues_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9) Evolve users: add company_id nullable and hook to companies

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "company_id" TEXT;

ALTER TABLE "users"
ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

