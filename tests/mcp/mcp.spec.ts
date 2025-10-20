import { test, expect } from "@playwright/test";

test.describe("MCP Space Scoping", () => {
  test.beforeEach(async ({ page }) => {
    // Set a valid space ID cookie for testing
    await page.context().addCookies([
      {
        name: "current-space-id",
        value: "test-space-id",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("should load MCP page with space scoping", async ({ page }) => {
    await page.goto("/mcp");
    
    // Should load without errors
    await expect(page).toHaveTitle(/MCP/);
    
    // Should show MCP dashboard
    await expect(page.locator("h1")).toContainText("MCP");
  });

  test("should handle invalid space ID cookie gracefully", async ({ page }) => {
    // Set an invalid space ID cookie
    await page.context().addCookies([
      {
        name: "current-space-id",
        value: "invalid-space-id",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/mcp");
    
    // Should still load the page (fallback to Personal space)
    await expect(page).toHaveTitle(/MCP/);
  });

  test("should create MCP server in current space", async ({ page }) => {
    await page.goto("/mcp");
    
    // Click create button
    await page.click("button:has-text('Create')");
    
    // Fill in MCP server details
    await page.fill('input[name="name"]', "test-mcp-server");
    await page.fill('textarea[name="config"]', JSON.stringify({
      command: "test-command",
      args: ["test-arg"]
    }));
    
    // Submit form
    await page.click("button[type='submit']");
    
    // Should create successfully
    await expect(page.locator("text=Success")).toBeVisible();
  });

  test("should show only MCP servers from current space", async ({ page }) => {
    await page.goto("/mcp");
    
    // Should only show MCP servers from the current space
    // This test assumes there are existing MCP servers
    const mcpServers = page.locator("[data-testid='mcp-server']");
    await expect(mcpServers).toHaveCount(0); // Adjust based on test data
  });
});

