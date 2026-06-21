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

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'launchpools'
        ) THEN
          ALTER TABLE launchpools ADD COLUMN IF NOT EXISTS min_stake_amount TEXT NOT NULL DEFAULT '0';
          ALTER TABLE launchpools ADD COLUMN IF NOT EXISTS max_stake_amount TEXT;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'bounties' AND column_name = 'max_participants'
        ) THEN
          ALTER TABLE bounties ALTER COLUMN max_participants DROP NOT NULL;
        END IF;
      END $$;
    `);
    console.log("[prepare-db-push] launchpool/bounty column sync complete");
  } catch (error) {
    console.warn("[prepare-db-push] skipped:", error instanceof Error ? error.message : error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
