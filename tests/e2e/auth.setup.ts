import { expect, test as setup } from "@playwright/test";
import { E2E_PASSWORD } from "./credentials";

for (const role of ["owner", "editor", "sales"] as const) {
  setup(`sign in as ${role}`, async ({ request }) => {
    const response = await request.post("/api/admin/auth/login", {
      data: { email: `${role}@e2e.test`, password: E2E_PASSWORD },
      headers: { origin: "http://127.0.0.1:8787" },
    });
    expect(response.status()).toBe(200);
    await request.storageState({ path: `playwright/.auth/${role}.json` });
  });
}
