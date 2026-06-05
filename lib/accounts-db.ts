/**
 * accounts-db.ts
 * PostgreSQL-backed accounts store for My Apex.
 * Replaces accounts.json.
 */
import { Pool } from "pg";

const DSN =
  process.env.APEX_DB_DSN ??
  "postgresql://postgres:apex2024@localhost:5432/apexgarmin";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: DSN });
  return pool;
}

export interface ApexAccount {
  user_id: string;
  email: string;
  name: string;
  password_hash: string;
  password_salt: string;
  garmin_email?: string;
  garmin_password?: string;
  onboarding_completed: boolean;
  created_at: string;
}

export async function dbFindByEmail(email: string): Promise<ApexAccount | null> {
  const res = await getPool().query(
    "SELECT * FROM apex_accounts WHERE email = $1",
    [email.toLowerCase().trim()]
  );
  return (res.rows[0] as ApexAccount) ?? null;
}

export async function dbCreateAccount(account: ApexAccount): Promise<void> {
  await getPool().query(
    `INSERT INTO apex_accounts
       (user_id, email, name, password_hash, password_salt, garmin_email, garmin_password, onboarding_completed, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      account.user_id,
      account.email,
      account.name,
      account.password_hash,
      account.password_salt,
      account.garmin_email ?? null,
      account.garmin_password ?? null,
      account.onboarding_completed,
      account.created_at,
    ]
  );
}

export async function dbUpdateGarminCredentials(
  email: string,
  garminEmail: string,
  garminPassword: string
): Promise<void> {
  await getPool().query(
    `UPDATE apex_accounts
     SET garmin_email = $2, garmin_password = $3
     WHERE email = $1`,
    [email.toLowerCase().trim(), garminEmail, garminPassword]
  );
}

export async function dbCompleteOnboarding(email: string): Promise<void> {
  await getPool().query(
    "UPDATE apex_accounts SET onboarding_completed = true WHERE email = $1",
    [email.toLowerCase().trim()]
  );
}
