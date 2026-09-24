// Prints SQL creating the end-to-end test accounts (never used in production).
// Run with: tsx tests/e2e/seed-users.ts > file.sql
import { hashPassword } from "../../lib/auth/password";
import { E2E_PASSWORD } from "./credentials";
const users = [
  { email: "owner@e2e.test", name: "مالك الاختبار", role: "owner" },
  { email: "editor@e2e.test", name: "محرر الاختبار", role: "editor" },
  { email: "sales@e2e.test", name: "مبيعات الاختبار", role: "sales" },
];

const now = Date.now();
for (const user of users) {
  const hash = await hashPassword(E2E_PASSWORD);
  console.log(
    `INSERT INTO admin_users (email, name, role, password_hash, must_change_password, is_active, failed_logins, created_at, updated_at) ` +
      `VALUES ('${user.email}', '${user.name}', '${user.role}', '${hash}', 0, 1, 0, ${now}, ${now});`,
  );
}
