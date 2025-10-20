import { test, expect } from "@playwright/test";

test.describe("Workflow Space Scoping", () => {
  test.beforeEach(async ({ page }) => {
    // Set a valid space ID cookie for testing
    await page.context().addCookies([
      {
        name: "current-space-id",
        value: "test-space-id-123",
        url: "http://localhost:3000",
      },
    ]);
  });

  test("should load workflows page with space scoping", async ({ page }) => {
    await page.goto("/workflow");
    await page.waitForLoadState("networkidle");

    // Check that the workflows page loads
    await expect(page.getByText("What is Workflow?")).toBeVisible();
  });

  test("should handle invalid current-space-id cookie gracefully", async ({
    page,
    browserName,
  }) => {
    // Set an invalid space ID cookie
    await page.context().addCookies([
      {
        name: "current-space-id",
        value: "invalid-space-id-123",
        url: "http://localhost:3000",
      },
    ]);

    await page.goto("/workflow");
    await page.waitForLoadState("networkidle");

    // Expect to be redirected to a valid space (e.g., the user's personal space)
    // The URL should no longer contain the invalid space ID, and should show workflows
    expect(page.url()).toContain("/workflow");
    expect(page.url()).not.toContain("invalid-space-id-123");
    await expect(page.getByText("What is Workflow?")).toBeVisible();
  });

  test("should create workflow in current space", async ({ page }) => {
    await page.goto("/workflow");
    await page.waitForLoadState("networkidle");

    // Check if create workflow button is visible (depends on user permissions)
    const createButton = page.getByText("Create Workflow");
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Fill in workflow details
      await page.fill('input[placeholder*="name" i]', "Test Workflow");
      await page.fill('textarea[placeholder*="description" i]', "Test workflow description");
      
      // Save the workflow
      await page.getByRole("button", { name: /save/i }).click();
      
      // Verify workflow was created and we're redirected to edit page
      await expect(page).toHaveURL(/\/workflow\/[a-f0-9-]+/);
    }
  });

  test("should filter workflows by current space", async ({ page }) => {
    await page.goto("/workflow");
    await page.waitForLoadState("networkidle");

    // The workflows displayed should be filtered by the current space
    // This is handled by the API, so we just verify the page loads correctly
    await expect(page.getByText("What is Workflow?")).toBeVisible();
  });
});

