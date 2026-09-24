import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_PASSWORD } from "./credentials";

const ORIGIN = { origin: "http://127.0.0.1:8787" };
// A 1×1 PNG: enough to exercise the upload pipeline end to end.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test.skip(({ isMobile }) => isMobile, "admin flows run once, on desktop");

/**
 * Cookie header for a saved session. Playwright's API client won't send
 * Secure cookies over the plain-http test server (browsers do on 127.0.0.1).
 */
function sessionHeader(role: "owner" | "editor" | "sales"): Record<string, string> {
  const state = JSON.parse(readFileSync(`playwright/.auth/${role}.json`, "utf8")) as { cookies: { name: string; value: string }[] };
  return { cookie: state.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ") };
}

async function as(browser: Browser, role: "owner" | "editor" | "sales"): Promise<Page> {
  const context = await browser.newContext({ storageState: `playwright/.auth/${role}.json`, locale: "ar" });
  return context.newPage();
}

test.describe("admin access", () => {
  test("signed-out visitors are sent to the login page, and bad passwords are refused", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fproducts/);

    await page.getByLabel("البريد الإلكتروني").fill("owner@e2e.test");
    await page.getByLabel("كلمة المرور").fill("wrong-password");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await expect(page.getByRole("alert")).toContainText("غير صحيحة");

    await page.getByLabel("كلمة المرور").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByRole("heading", { name: "المنتجات", level: 1 })).toBeVisible();
  });

  test("each role only sees and reaches its own sections", async ({ browser }) => {
    const sales = await as(browser, "sales");
    await sales.goto("/admin");
    const salesNav = sales.getByRole("navigation", { name: "أقسام لوحة التحكم" });
    await expect(salesNav.getByRole("link", { name: "الطلبات" })).toBeVisible();
    await expect(salesNav.getByRole("link", { name: "المنتجات" })).toHaveCount(0);
    await expect(salesNav.getByRole("link", { name: "الموظفون" })).toHaveCount(0);
    await sales.goto("/admin/products");
    await expect(sales).toHaveURL(/\/admin\?denied=1/);
    await expect(sales.getByText("ليست لديك صلاحية")).toBeVisible();

    const editor = await as(browser, "editor");
    await editor.goto("/admin");
    const editorNav = editor.getByRole("navigation", { name: "أقسام لوحة التحكم" });
    await expect(editorNav.getByRole("link", { name: "المنتجات" })).toBeVisible();
    await expect(editorNav.getByRole("link", { name: "الطلبات" })).toHaveCount(0);
  });

  test("the API enforces roles and blocks cross-site changes", async ({ request }) => {
    const sales = sessionHeader("sales");
    expect((await request.get("/api/admin/inquiries", { headers: sales })).status()).toBe(200);
    expect((await request.patch("/api/admin/products/1", { data: {}, headers: { ...sales, ...ORIGIN } })).status()).toBe(403);
    expect((await request.get("/api/admin/users", { headers: sales })).status()).toBe(403);

    const editor = sessionHeader("editor");
    expect((await request.get("/api/admin/inquiries", { headers: editor })).status()).toBe(403);
    expect((await request.delete("/api/admin/products/1?hard=1", { headers: { ...editor, ...ORIGIN } })).status()).toBe(403);

    const owner = sessionHeader("owner");
    expect((await request.patch("/api/admin/inquiries/1", { data: { status: "closed" }, headers: { ...owner, origin: "https://evil.test" } })).status()).toBe(403);
    expect((await request.patch("/api/admin/inquiries/1", { data: { status: "closed" }, headers: owner })).status()).toBe(403);
    expect((await request.get("/api/admin/inquiries")).status()).toBe(401);
  });
});

test.describe("inquiries", () => {
  test("sales finds a new request, takes it and updates its status", async ({ browser, request }) => {
    const created = await request.post("/api/inquiries", {
      data: { fields: { type: "service", name: "عميل الاختبار", phone: "0591112233", message: "الطابعة تحتاج صيانة" }, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" },
    });
    expect(created.status()).toBe(201);
    const { reference } = (await created.json()).data as { reference: string };

    const page = await as(browser, "sales");
    await page.goto("/admin/inquiries");
    await page.getByPlaceholder("الاسم، الهاتف أو رقم الطلب").fill(reference);
    await page.getByRole("button", { name: "تطبيق" }).click();
    await page.getByRole("link", { name: reference }).click();

    await expect(page.getByText("الطابعة تحتاج صيانة")).toBeVisible();
    await expect(page.getByRole("link", { name: "واتساب" })).toHaveAttribute("href", /wa\.me\/970591112233/);
    await page.getByLabel("الحالة").selectOption("in_progress");
    await page.getByLabel("المسؤول").selectOption({ label: "مبيعات الاختبار" });
    await page.getByLabel("ملاحظات داخلية").fill("سأتصل به صباحاً");
    await page.getByRole("button", { name: "حفظ" }).click();

    await expect(page.locator(".admin-page-header .status-badge")).toHaveText("قيد المتابعة");
    await expect(page.getByLabel("ملاحظات داخلية")).toHaveValue("سأتصل به صباحاً");
    await page.goto("/admin/inquiries?assigned=me");
    await expect(page.getByRole("link", { name: reference })).toBeVisible();
    await expect(page.getByRole("link", { name: "تصدير CSV" })).toBeVisible();
  });
});

test.describe("catalog management", () => {
  test("an owner adds a product with a photo and price, publishes, archives and deletes it", async ({ browser }) => {
    const page = await as(browser, "owner");
    await page.goto("/admin/products/new");
    await page.getByLabel("اسم المنتج *").fill("طابعة اختبار ملونة");
    await page.getByLabel("الموديل", { exact: true }).fill("E2E-100");
    await page.getByLabel("العلامة التجارية *").selectOption({ label: "Canon" });
    await page.getByLabel("التصنيف *").selectOption({ label: "الطابعات" });
    await page.getByLabel("الوصف").fill("منتج أنشأه اختبار آلي.");
    await page.getByLabel("مواصفة 1").fill("طباعة ملونة");
    await page.getByLabel("اختيار صورة المنتج").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByAltText("صورة المنتج")).toBeVisible();
    await page.getByRole("textbox", { name: /^السعر/ }).fill("1,250.50");
    await page.getByRole("combobox", { name: /^الحالة/ }).selectOption("published");
    await page.getByRole("button", { name: "إضافة المنتج" }).click();

    await expect(page).toHaveURL(/\/admin\/products\/\d+\?saved=1/);
    await expect(page.getByRole("textbox", { name: /^رابط المنتج/ })).toHaveValue("canon-e2e-100");

    const publicPage = await browser.newPage();
    await publicPage.goto("/product/canon-e2e-100");
    await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText("طابعة اختبار ملونة");
    await expect(publicPage.locator(".product-detail-info .price-tag")).toHaveText("₪1,250.50");
    const image = publicPage.locator(".product-detail-media img");
    await expect(image).toHaveAttribute("src", /\/api\/images\/products\/.+\.png$/);
    const imageSrc = (await image.getAttribute("src"))!;
    const imageResponse = await publicPage.request.get(imageSrc);
    expect(imageResponse.headers()["cache-control"]).toContain("immutable");

    await page.getByRole("button", { name: "أرشفة" }).click();
    await page.getByRole("button", { name: "أرشفة", exact: true }).last().click();
    await expect(page.locator(".admin-page-header .status-badge")).toHaveText("مؤرشف");
    expect((await publicPage.goto("/product/canon-e2e-100"))?.status()).toBe(404);

    await page.getByRole("button", { name: "حذف نهائي" }).first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: "حذف نهائي" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    // The photo is removed from storage with the product.
    expect((await publicPage.request.get(imageSrc)).status()).toBe(404);
  });

  test("brands can be added and removed, but not while products use them", async ({ browser }) => {
    const page = await as(browser, "editor");
    await page.goto("/admin/brands");
    await page.getByRole("button", { name: "إضافة العلامة" }).click();
    await page.getByLabel("الاسم *").fill("Brother");
    await page.getByRole("button", { name: "حفظ" }).click();
    await expect(page.getByRole("cell", { name: "brother", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "حذف Brother" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "حذف" }).click();
    await expect(page.getByRole("cell", { name: "brother", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "حذف Xerox" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("مرتبط بـ 4 منتج");
    await page.getByRole("alertdialog").getByRole("button", { name: "حذف" }).click();
    await expect(page.getByText("لا يمكن حذف العلامة")).toBeVisible();
  });
});

test.describe("staff accounts", () => {
  test("an owner invites staff, who must set their own password, and signing out ends the session", async ({ browser }) => {
    const owner = await as(browser, "owner");
    await owner.goto("/admin/users");
    await owner.getByRole("button", { name: "إضافة موظف" }).click();
    await owner.getByLabel("الاسم *").fill("موظف جديد");
    await owner.getByLabel("البريد الإلكتروني *").fill("newhire@e2e.test");
    await owner.getByLabel("الصلاحية").selectOption("sales");
    await owner.getByRole("button", { name: "إضافة", exact: true }).click();
    const temporaryPassword = (await owner.locator(".admin-notice code").innerText()).trim();
    expect(temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);

    const context = await browser.newContext({ locale: "ar" });
    const newHire = await context.newPage();
    await newHire.goto("/admin/login");
    await newHire.getByLabel("البريد الإلكتروني").fill("newhire@e2e.test");
    await newHire.getByLabel("كلمة المرور").fill(temporaryPassword);
    await newHire.getByRole("button", { name: "تسجيل الدخول" }).click();
    await expect(newHire).toHaveURL(/\/admin\/account\?required=1/);
    await newHire.goto("/admin/inquiries");
    await expect(newHire).toHaveURL(/\/admin\/account\?required=1/);

    await newHire.getByLabel(/كلمة المرور الحالية/).fill(temporaryPassword);
    await newHire.getByRole("textbox", { name: /^كلمة المرور الجديدة/ }).fill("my-own-new-password");
    await newHire.getByLabel("تأكيد كلمة المرور الجديدة").fill("my-own-new-password");
    await newHire.getByRole("button", { name: "حفظ كلمة المرور" }).click();
    await expect(newHire).toHaveURL(/\/admin$/);
    await expect(newHire.getByRole("heading", { name: /أهلاً، موظف جديد/ })).toBeVisible();

    await newHire.getByRole("button", { name: "تسجيل الخروج" }).click();
    await expect(newHire).toHaveURL(/\/admin\/login/);
    await newHire.goto("/admin");
    await expect(newHire).toHaveURL(/\/admin\/login/);

    await owner.goto("/admin/audit");
    await expect(owner.getByRole("cell", { name: "إضافة موظف" }).first()).toBeVisible();
    await expect(owner.getByRole("cell", { name: "تغيير كلمة المرور" }).first()).toBeVisible();
  });
});
