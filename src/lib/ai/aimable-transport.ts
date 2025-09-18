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

    // Capture guardrail names from streaming and non-streaming responses in the browser
    try {
      const contentType = response.headers.get("content-type") || "";
      const isSse = /text\/event-stream/i.test(contentType);
      if (isSse && (response as any).body?.tee) {
        const [logStream, appStream] = (response as any).body.tee();
        const reader = (logStream as ReadableStream).getReader();
        const decoder = new TextDecoder();
        (async () => {
          try {
            let done = false;
            let buffer = "";
            while (!done) {
              const { value, done: streamDone } = await reader.read();
              if (value) {
                buffer += decoder.decode(value, { stream: true });
                // Process complete SSE events
                const parts = buffer.split(/\n\n/);
                buffer = parts.pop() || "";
                for (const part of parts) {
                  const lines = part.split(/\n/);
                  for (const line of lines) {
                    if (!line.startsWith("data:")) continue;
                    const raw = line.slice(5).trimStart();
                    try {
                      const json = JSON.parse(raw);
                      if (Array.isArray(json?.violated_output_guardrails)) {
                        const names = json.violated_output_guardrails
                          .map((g: any) => g?.name)
                          .filter(Boolean);
                        if (names.length > 0) {
                          (window as any).__aimableLastGuardrailNames = names;
                        }
                      }
                    } catch {}
                  }
                }
              }
              done = streamDone;
            }
          } catch {}
        })();

        return new Response(appStream as any, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } else {
        // Non-streaming: clone and parse once
        const clone = response.clone();
        const text = await clone.text();
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json?.violated_output_guardrails)) {
            const names = json.violated_output_guardrails
              .map((g: any) => g?.name)
              .filter(Boolean);
            if (names.length > 0) {
              (window as any).__aimableLastGuardrailNames = names;
            }
          }
        } catch {}
      }
    } catch {}

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
