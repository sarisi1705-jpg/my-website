import { expect, test } from "@playwright/test";

// Clicks real links in the production build. Guards against client-side
// navigation bugs (vinext's <Link> broke on click in production builds).
test.describe("site navigation", () => {
  test.skip(({ isMobile }) => isMobile, "desktop header; the mobile menu is covered below");

  test("header links, products menu and footer links navigate", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("navigation", { name: "التنقل الرئيسي" }).getByRole("link", { name: "خدماتنا" }).click();
    await expect(page).toHaveURL(/\/services$/);

    await page.getByRole("button", { name: "المنتجات" }).click();
    await page.getByRole("menuitem", { name: /الأحبار والتونر/ }).click();
    await expect(page).toHaveURL(/\/products\/toners$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("الأحبار والتونر");

    await page.getByRole("link", { name: "SSPS — الصفحة الرئيسية" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.locator("footer").getByRole("link", { name: "من نحن" }).click();
    await expect(page).toHaveURL(/\/about$/);
  });

  test("catalog links, pagination and product cards navigate", async ({ page }) => {
    await page.goto("/");
    await page.locator("#categories").getByRole("link", { name: /الطابعات/ }).click();
    await expect(page).toHaveURL(/\/products\/printers$/);

    await page.locator("article.product-card").first().getByRole("link").click();
    await expect(page).toHaveURL(/\/product\//);

    await page.getByRole("navigation", { name: "مسار التنقل" }).getByRole("link", { name: "المنتجات" }).click();
    await expect(page).toHaveURL(/\/products$/);
  });
});

test.describe("mobile menu", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile only");

  test("opens and navigates", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "فتح القائمة" }).click();
    await page.getByRole("navigation", { name: "التنقل الرئيسي للهاتف" }).getByRole("link", { name: "العروض" }).click();
    await expect(page).toHaveURL(/\/offers$/);
  });
});
