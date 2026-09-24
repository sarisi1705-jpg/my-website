/**
 * Creates (or recovers) an owner account.
 *
 *   pnpm admin:create-owner --local     # local dev database
 *   pnpm admin:create-owner --remote    # production database
 *   pnpm admin:create-owner             # just print the SQL
 *
 * If the email already exists, that account becomes an active, unlocked owner
 * with the new password, which is the way back in if every owner is locked out.
 */
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../lib/auth/password";

const target = process.argv.includes("--remote") ? "--remote" : process.argv.includes("--local") ? "--local" : null;

async function askHidden(question: string): Promise<string> {
  stdout.write(question);
  stdin.setRawMode?.(true);
  stdin.resume();
  let value = "";
  return new Promise(resolve => {
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          return resolve(value);
        }
        if (char === "\u0003") process.exit(130); // Ctrl+C
        if (char === "\u007f") value = value.slice(0, -1); // Backspace
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

const sql = (value: string) => `'${value.replace(/'/g, "''")}'`;

const rl = createInterface({ input: stdin, output: stdout });
const email = (await rl.question("Owner email: ")).trim().toLowerCase();
const name = (await rl.question("Name (e.g. المالك): ")).trim() || "المالك";
rl.close();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That doesn't look like an email address.");
const password = await askHidden(`Password (at least ${MIN_PASSWORD_LENGTH} characters): `);
if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
if ((await askHidden("Repeat password: ")) !== password) throw new Error("Passwords don't match.");

const now = Date.now();
const statement =
  `INSERT INTO admin_users (email, name, role, password_hash, must_change_password, is_active, failed_logins, created_at, updated_at) ` +
  `VALUES (${sql(email)}, ${sql(name)}, 'owner', ${sql(await hashPassword(password))}, 0, 1, 0, ${now}, ${now}) ` +
  `ON CONFLICT(email) DO UPDATE SET role = 'owner', password_hash = excluded.password_hash, is_active = 1, failed_logins = 0, locked_until = NULL, must_change_password = 0, updated_at = excluded.updated_at;`;

if (!target) {
  console.log(`\nRun this against the database:\n\n${statement}\n`);
} else {
  execFileSync("npx", ["wrangler", "d1", "execute", "DB", target, "--command", statement], { stdio: "inherit" });
  console.log(`\nOwner account ready: ${email} (${target === "--remote" ? "production" : "local"} database). Sign in at /admin/login`);
}
