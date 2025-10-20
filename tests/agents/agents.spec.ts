import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../constants/test-users";

test.describe("Agent Access Spec", () => {
  test.use({ storageState: TEST_USERS.admin.authFile });

  test("should access agents page when authenticated (with fallback space)", async ({ page }) => {
    // Ensure a space is selected for scoping
    await page.context().addCookies([
      // Purposely use a non-member space id to trigger fallback
      { name: "current-space-id", value: "non-member-space", url: "http://localhost" },
    ]);
    await page.goto("/agents");
    await page.waitForLoadState("networkidle");

    // Should stay on agents page
    const currentUrl = page.url();
    expect(currentUrl).toContain("/agents");

    // Should see agents page content
    await expect(page.getByTestId("agents-title")).toBeVisible();
  });

  test("should navigate to new agent page", async ({ page }) => {
    await page.context().addCookies([
      { name: "current-space-id", value: "test-space-id", url: "http://localhost" },
    ]);
    await page.goto("/agent/new");
    await page.waitForLoadState("networkidle");

    // Should be on the new agent page
    expect(page.url()).toContain("/agent/new");

    // Should see agent creation form
    await expect(page.getByTestId("agent-name-input")).toBeVisible();
  });

  test("should have sidebar with agent list", async ({ page }) => {
    await page.context().addCookies([
      { name: "current-space-id", value: "test-space-id", url: "http://localhost" },
    ]);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should have sidebar with agents section
    const agentsLink = page.locator('a[href="/agents"]');
    await expect(agentsLink).toBeVisible();
  });
});
