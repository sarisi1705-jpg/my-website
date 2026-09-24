import { expect, test } from "@playwright/test";

const cards = "article.product-card";

test.describe("catalog", () => {
  test("search runs as you type, keeps the URL shareable, and Back restores filters", async ({ page }) => {
    await page.goto("/products");
    await expect(page.locator(cards)).toHaveCount(16);

    await page.getByLabel("ابحث داخل الكتالوج").fill("ليزر");
    await expect(page).toHaveURL(/\/products\?q=%D9%84%D9%8A%D8%B2%D8%B1/);
    await expect(page.locator(cards)).toHaveCount(3);

    await page.getByLabel("العلامة التجارية").click();
    await page.getByRole("option", { name: "HP" }).click();
    await expect(page).toHaveURL(/brand=hp/);
    await expect(page.locator(cards)).toHaveCount(2);

    await page.getByRole("button", { name: /مسح الفلاتر/ }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.locator(cards)).toHaveCount(16);

    await page.goBack();
    await expect(page.locator(cards)).toHaveCount(2);
    await expect(page.getByLabel("ابحث داخل الكتالوج")).toHaveValue("ليزر");
  });

  test("Arabic spelling variants find the same products", async ({ page }) => {
    await page.goto("/products?q=" + encodeURIComponent("طابعه"));
    const withHaa = await page.locator(`${cards} h3`).allInnerTexts();
    await page.goto("/products?q=" + encodeURIComponent("طابعة"));
    expect(await page.locator(`${cards} h3`).allInnerTexts()).toEqual(withHaa);
    expect(withHaa.length).toBeGreaterThan(0);
  });

  test("the homepage search lands on the results", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("ابحث عن منتج").fill("تونر");
    await page.getByRole("button", { name: "بحث" }).click();
    await expect(page).toHaveURL(/\/products\?q=/);
    await expect(page.getByLabel("ابحث داخل الكتالوج")).toHaveValue("تونر");
    await expect(page.locator(cards).first()).toBeVisible();
  });

  test("old Arabic category links still work", async ({ page }) => {
    await page.goto("/products?category=" + encodeURIComponent("طابعات"));
    await expect(page.locator(cards)).toHaveCount(4);
    await expect(page.locator('.category-card[aria-current="true"]')).toContainText("الطابعات");
  });

  test("category pages list their products and handle empty or unknown categories", async ({ page }) => {
    await page.goto("/products/printers");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("الطابعات");
    await expect(page.locator(cards)).toHaveCount(4);

    await page.goto("/products/solutions");
    await expect(page.getByText("سيتم إضافة المنتجات قريباً")).toBeVisible();

    const missing = await page.goto("/products/does-not-exist");
    expect(missing?.status()).toBe(404);
  });

  test("results are paginated", async ({ page }) => {
    await page.goto("/products?pageSize=5&page=2");
    await expect(page.locator(cards)).toHaveCount(5);
    await expect(page.locator(".catalog-pagination [aria-current=page]")).toHaveText("2");
    await page.getByRole("link", { name: "التالي" }).click();
    await expect(page).toHaveURL(/page=3/);
  });

  test("product pages have details, metadata and related products", async ({ page }) => {
    const response = await page.goto("/product/hp-laserjet-pro-4103fdw");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/LaserJet Pro 4103fdw/);
    await expect(page.getByText("السعر عند الطلب").first()).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
    await expect(page.locator(".catalog-section article.product-card")).toHaveCount(3);

    expect((await page.goto("/product/does-not-exist"))?.status()).toBe(404);
  });
});

test.describe("API and SEO", () => {
  test("public catalog endpoints", async ({ request }) => {
    const list = await (await request.get("/api/products?pageSize=2&category=printers")).json();
    expect(list.data).toMatchObject({ total: 4, pageSize: 2, pageCount: 2 });
    expect(list.data.items[0]).toHaveProperty("imageUrl");

    expect((await request.get("/api/products/does-not-exist")).status()).toBe(404);
    expect((await (await request.get("/api/categories")).json()).data).toHaveLength(5);
    expect((await (await request.get("/api/brands")).json()).data).toHaveLength(6);
  });

  test("sitemap lists products and robots blocks the admin", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/product/hp-laserjet-pro-4103fdw");
    expect(sitemap).toContain("/products/printers");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
  });
});
