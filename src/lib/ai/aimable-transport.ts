/**
 * Custom fetch wrapper that captures response headers, specifically x-routing-details
 */
export function createAimableFetch() {
  const originalFetch = window.fetch;

  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const response = await originalFetch(input, init);

    // Capture the routing details header
    const routingDetails = response.headers.get("x-routing-details");
    if (routingDetails) {
      // Store globally for access by components
      (window as any).__lastRoutingDetails = routingDetails;
    }

    return response;
  };
}

/**
 * Get the last routing details from the Aimable proxy (frontend)
 */
export function getLastRoutingDetails(): string | null {
  return (window as any).__lastRoutingDetails || null;
}

/**
 * Parse routing details JSON
 */
export function parseRoutingDetails(routingDetails: string | null): {
  sensitivity_score: number;
  sensitivity_threshold: number;
  use_trusted_model: boolean;
  model_to_use: string;
} | null {
  if (!routingDetails) return null;

  try {
    return JSON.parse(routingDetails);
  } catch (error) {
    console.error("Failed to parse routing details:", error);
    return null;
  }
}
