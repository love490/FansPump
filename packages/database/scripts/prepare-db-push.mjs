/**
 * Runs before `prisma db push` on deploy.
 * Clears duplicate usernames (keeps oldest per name) and drops a legacy unique constraint if present.
 */
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'username'
        ) THEN
          WITH ranked AS (
            SELECT id,
              ROW_NUMBER() OVER (PARTITION BY LOWER(username) ORDER BY created_at ASC) AS rn
            FROM users
            WHERE username IS NOT NULL
          )
          UPDATE users u
          SET username = NULL, updated_at = NOW()
          FROM ranked r
          WHERE u.id = r.id AND r.rn > 1;

          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
        END IF;
      END $$;
    `);
    console.log("[prepare-db-push] username dedupe complete");
  } catch (error) {
    console.warn("[prepare-db-push] skipped:", error instanceof Error ? error.message : error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
