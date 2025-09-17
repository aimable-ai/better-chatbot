import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Custom Aimable provider that captures response headers, specifically x-routing-details
 */
export function createAimableProvider({
  name,
  apiKey,
  baseURL,
}: {
  name: string;
  apiKey: string;
  baseURL: string;
}) {
  // Return a function that creates models with custom fetch to capture headers
  return (modelName: string) => {
    // Create a custom fetch function that captures response headers
    const customFetch = async (
      input: URL | RequestInfo,
      init?: RequestInit,
    ): Promise<Response> => {
      const response = await fetch(input, init);

      // Store the routing details header globally for access by the API routes
      const routingDetails = response.headers.get("x-routing-details");
      if (routingDetails) {
        // Store in a global variable that can be accessed by the API routes
        (globalThis as any).__lastRoutingDetails = routingDetails;
      }

      return response;
    };

    // Create a new model with our custom fetch
    const customProvider = createOpenAICompatible({
      name,
      apiKey,
      baseURL,
      fetch: customFetch,
    });

    return customProvider(modelName);
  };
}

/**
 * Get the last routing details from the Aimable proxy
 */
export function getLastRoutingDetails(): string | null {
  return (globalThis as any).__lastRoutingDetails || null;
}

/**
 * Clear the stored routing details
 */
export function clearLastRoutingDetails(): void {
  delete (globalThis as any).__lastRoutingDetails;
}
