import { expect, test, type Page } from "@playwright/test";

type TelegramMessage = { chat_id: string; text: string };

async function telegramMessages(): Promise<TelegramMessage[]> {
  const response = await fetch("http://127.0.0.1:8799/messages");
  return (await response.json()) as TelegramMessage[];
}

async function waitForTurnstile(page: Page) {
  // The always-pass test site key fills this hidden input once solved.
  await expect(page.locator("input[name=cf-turnstile-response]")).not.toHaveValue("", { timeout: 15_000 });
}

test.describe("quote and contact requests", () => {
  // Submissions share a 5-per-minute rate limit, so only one project submits.
  test.skip(({ isMobile }) => isMobile, "submissions run once, on desktop");

  test("a visitor requests a quote for a product and staff get a Telegram alert", async ({ page }) => {
    await page.goto("/contact?type=quote&product=3");
    await expect(page.getByRole("heading", { name: "اطلب عرض سعر" })).toBeVisible();
    await expect(page.locator(".inquiry-product")).toContainText("LaserJet Pro 4103fdw");
    await expect(page.getByRole("radio", { name: "طلب عرض سعر" })).toHaveAttribute("aria-checked", "true");

    await page.getByLabel("الاسم الكامل *").fill("خالد منصور");
    await page.getByLabel("رقم الهاتف *").fill("٠٥٩٩ ١٢٣ ٤٥٦");
    await page.getByLabel("الكمية").fill("2");
    await page.getByLabel("تفاصيل إضافية").fill("نحتاج توصيل إلى رام الله");
    await waitForTurnstile(page);
    await page.getByRole("button", { name: "إرسال الطلب" }).click();

    const success = page.getByRole("status").filter({ hasText: "تم استلام طلبك بنجاح" });
    await expect(success).toBeVisible();
    const reference = (await success.locator("strong").innerText()).trim();
    expect(reference).toMatch(/^SSPS-\d{6}$/);

    await expect.poll(async () => (await telegramMessages()).find(message => message.text.includes(reference))?.text, { timeout: 10_000 })
      .toEqual(expect.stringContaining("الهاتف: 0599123456"));
    const alert = (await telegramMessages()).find(message => message.text.includes(reference))!;
    expect(alert.chat_id).toBe("1000");
    expect(alert.text).toContain("HP LaserJet Pro 4103fdw) × 2");
  });

  test("the form explains what is missing before sending anything", async ({ page }) => {
    await page.goto("/contact?type=service");
    await expect(page.getByRole("radio", { name: "طلب خدمة أو صيانة" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "إرسال الطلب" }).click();

    await expect(page.getByText("يرجى كتابة الاسم (حرفان على الأقل)")).toBeVisible();
    await expect(page.getByText("يرجى كتابة رقم هاتف صحيح")).toBeVisible();
    await expect(page.getByText("يرجى كتابة تفاصيل طلبك (5 أحرف على الأقل)")).toBeVisible();
  });

  test("the API rejects submissions that fail the spam check or validation", async ({ request }) => {
    const noToken = await request.post("/api/inquiries", {
      data: { fields: { type: "contact", name: "سارة", phone: "0599999999", message: "استفسار عن الصيانة" } },
    });
    expect(noToken.status()).toBe(403);

    const invalid = await request.post("/api/inquiries", {
      data: { fields: { type: "contact", name: "a", phone: "1" }, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" },
    });
    expect(invalid.status()).toBe(400);
    const body = await invalid.json();
    expect(Object.keys(body.error.fieldErrors)).toEqual(expect.arrayContaining(["name", "phone", "message"]));
  });
});

test.describe("calls to action", () => {
  test("a product page offers a quote form with the product filled in", async ({ page }) => {
    await page.goto("/products");
    await page.locator(".product-card").first().getByRole("link", { name: /عرض تفاصيل/ }).click();
    await expect(page).toHaveURL(/\/product\/[a-z0-9-]+$/);
    const name = await page.getByRole("heading", { level: 1 }).innerText();

    await page.getByRole("link", { name: "اطلب عرض سعر" }).click();
    await expect(page.locator("#quote .inquiry-product strong")).toHaveText(name);
  });

  test("the services page asks for a service request", async ({ page }) => {
    await page.goto("/services");
    await page.getByRole("link", { name: /اطلب الخدمة الآن/ }).click();
    await expect(page.getByRole("heading", { name: "اطلب خدمة أو صيانة" })).toBeVisible();
  });
});

test.describe("layout", () => {
  for (const path of ["/", "/products", "/products/printers", "/product/hp-laserjet-pro-4103fdw", "/contact", "/services", "/offers"]) {
    test(`${path} has no horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
