import { expect, test, type Page } from "@playwright/test";

// scripts/e2e-server.sh prices two demo products: toner (id 7) ₪89.50 and paper (id 13) ₪45.
const TONER = { id: 7, slug: "hp-w2031a", name: "تونر LaserJet سماوي" };
const PAPER = { id: 13, name: "ورق تصوير يومي" };
const ORIGIN = { origin: "http://127.0.0.1:8787" };

type TelegramMessage = { chat_id: string; text: string };

async function telegramMessages(): Promise<TelegramMessage[]> {
  const response = await fetch("http://127.0.0.1:8799/messages");
  return (await response.json()) as TelegramMessage[];
}

async function waitForTurnstile(page: Page) {
  // The always-pass test site key fills this hidden input once solved.
  await expect(page.locator("input[name=cf-turnstile-response]")).not.toHaveValue("", { timeout: 15_000 });
}

test.describe("online store", () => {
  test("products without a price can only be quoted", async ({ page }) => {
    await page.goto("/product/xerox-versalink-b415");
    await expect(page.locator(".product-detail-info .price-tag")).toHaveText("السعر عند الطلب");
    await expect(page.getByRole("button", { name: "أضف إلى السلة" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "اطلب عرض سعر" })).toBeVisible();
  });

  test("the cart keeps quantities and shows server prices", async ({ page }) => {
    await page.goto(`/product/${TONER.slug}`);
    await page.getByRole("button", { name: "زيادة الكمية" }).click();
    await page.getByRole("button", { name: "أضف إلى السلة" }).click();
    await expect(page.getByRole("link", { name: "السلة (2 قطع)" })).toBeVisible();

    await page.goto("/products/paper");
    await page.getByRole("button", { name: `أضف ${PAPER.name} إلى السلة` }).click();
    await expect(page.getByRole("link", { name: "السلة (3 قطع)" })).toBeVisible();

    await page.goto("/cart");
    await expect(page.locator(".cart-line")).toHaveCount(2);
    await expect(page.locator(".cart-summary")).toContainText("₪224");
    await page.locator(".cart-line").filter({ hasText: PAPER.name }).getByRole("button", { name: "حذف" }).click();
    await expect(page.locator(".cart-line")).toHaveCount(1);
    await expect(page.locator(".cart-summary")).toContainText("₪179");

    // Survives a reload: the cart lives in the browser.
    await page.reload();
    await expect(page.locator(".cart-line")).toContainText(TONER.name);
  });
});

test.describe("checkout", () => {
  // Orders share a 5-per-minute rate limit, so only one project submits.
  test.skip(({ isMobile }) => isMobile, "submissions run once, on desktop");

  test("a shopper orders, staff get a Telegram alert and handle the order", async ({ page, browser }) => {
    await page.goto(`/product/${TONER.slug}`);
    await page.getByRole("button", { name: "زيادة الكمية" }).click();
    await page.getByRole("button", { name: "زيادة الكمية" }).click();
    await page.getByRole("button", { name: "أضف إلى السلة" }).click();
    await page.goto("/cart");
    await expect(page.locator(".cart-summary")).toContainText("₪268.50");
    await page.getByRole("link", { name: "إتمام الطلب" }).click();

    await expect(page).toHaveURL(/\/checkout$/);
    await page.getByRole("button", { name: "تأكيد الطلب" }).click();
    await expect(page.getByText("يرجى كتابة الاسم (حرفان على الأقل)")).toBeVisible();
    await expect(page.getByText("اكتب المدينة أو البلدة")).toBeVisible();

    await page.getByLabel("الاسم الكامل *").fill("منى سعيد");
    await page.getByLabel("رقم الهاتف *").fill("٠٥٩٩ ٨٨٨ ٧٧٧");
    await expect(page.getByRole("radio", { name: /الضفة الغربية/ })).toHaveAttribute("aria-checked", "true");
    await page.getByLabel("المدينة أو البلدة *").fill("نابلس");
    await page.getByLabel("العنوان *").fill("شارع فيصل، قرب الدوار");
    await expect(page.locator(".checkout-summary")).toContainText("₪288.50");
    await waitForTurnstile(page);
    await page.getByRole("button", { name: "تأكيد الطلب" }).click();

    const success = page.getByRole("status").filter({ hasText: "تم استلام طلبك" });
    await expect(success).toBeVisible();
    const reference = (await success.locator("strong").first().innerText()).trim();
    expect(reference).toMatch(/^ORD-\d{6}$/);
    await expect(page.getByRole("link", { name: "السلة فارغة" })).toBeVisible();

    await expect.poll(async () => (await telegramMessages()).find(message => message.text.includes(reference))?.text, { timeout: 10_000 })
      .toEqual(expect.stringContaining("الإجمالي: ₪288.50"));
    const alert = (await telegramMessages()).find(message => message.text.includes(reference))!;
    expect(alert.text).toContain(`${TONER.name} (HP W2031A) × 3 = ₪268.50`);
    expect(alert.text).toContain("الهاتف: 0599888777");

    const staff = await (await browser.newContext({ storageState: "playwright/.auth/sales.json", locale: "ar" })).newPage();
    await staff.goto("/admin/orders");
    await staff.getByRole("link", { name: reference }).click();
    await expect(staff.getByRole("heading", { level: 1 })).toHaveText(reference);
    await expect(staff.locator(".admin-table")).toContainText("₪288.50");
    await staff.getByLabel("حالة الطلب").selectOption("confirmed");
    await staff.getByLabel("حالة الدفع").selectOption("paid");
    await staff.getByRole("button", { name: "حفظ" }).click();
    await expect(staff.locator(".admin-page-header")).toContainText("مؤكد");
    await expect(staff.locator(".admin-page-header")).toContainText("مدفوع");
  });

  test("the server refuses tampered prices and unpriced products", async ({ request }) => {
    const fields = { name: "اختبار", phone: "0599000000", deliveryZone: "pickup", paymentMethod: "cod" };
    const order = (items: unknown, expectedTotalMinor: number) =>
      request.post("/api/orders", { data: { fields, items, expectedTotalMinor, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" }, headers: ORIGIN });

    const cheap = await order([{ productId: TONER.id, quantity: 1 }], 100);
    expect(cheap.status()).toBe(409);
    expect((await cheap.json()).error.code).toBe("price_changed");

    const unpriced = await order([{ productId: 1, quantity: 1 }], 0);
    expect(unpriced.status()).toBe(409);
    expect((await unpriced.json()).error.code).toBe("cart_changed");
  });
});
