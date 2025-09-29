import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { collectUploadedFiles } from "./utils/aimable-files";
import { AsyncLocalStorage } from "node:async_hooks";

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
      // Rebuild payload for Aimable to ensure top-level uploaded_files and preserve attachments
      let rebuiltInit = init;
      try {
        const isPost = (init?.method || "POST").toUpperCase() === "POST";
        const urlString =
          typeof input === "string"
            ? input
            : (input as any)?.url || String(input);
        const isAimableUrl =
          typeof urlString === "string" && /aimable/i.test(urlString);
        if (isPost && isAimableUrl && init?.body) {
          const originalBodyText =
            typeof init.body === "string"
              ? init.body
              : await new Response(init.body).text();
          const originalJson = JSON.parse(originalBodyText || "{}");

          // Pull originals captured earlier
          const originalMessages =
            (globalThis as any).__aimableOriginalMessages ||
            originalJson.messages;
          const explicitUploaded =
            (globalThis as any).__aimableExplicitUploadedFiles ||
            originalJson.uploaded_files;
          const uploadedFilesTopLevel = collectUploadedFiles(
            originalMessages,
            explicitUploaded,
          );

          // Preserve attachments within messages; strip per-message uploaded_files if present
          const sanitizedMessages = (originalJson.messages || []).map(
            (m: any) => {
              if (m && typeof m === "object") {
                const { uploaded_files: _drop, ...rest } = m;
                return rest;
              }
              return m;
            },
          );

          const payload = {
            ...originalJson,
            messages: sanitizedMessages,
            stream: Boolean(originalJson.stream),
            trusted_model_override: originalJson.trusted_model_override ?? null,
            uploaded_files: uploadedFilesTopLevel,
          };

          const headers = {
            ...(init.headers as any),
            "Content-Type": "application/json",
          } as Record<string, string>;

          // Inject request-type and user name headers if set by server-side context
          try {
            const reqType = getCurrentRequestType?.();
            if (reqType && !headers["X-Request-Type"]) {
              headers["X-Request-Type"] = reqType;
            }
            const userName = getCurrentUserName?.();
            if (userName && !headers["X-Name"]) {
              headers["X-Name"] = userName;
            }
          } catch {}

          // Log outbound request only (no response)
          const url = urlString;
          const body = JSON.stringify(payload);
          console.log("[AimableProxy][OUTBOUND]", {
            url,
            headers,
            payload: JSON.parse(body),
          });

          rebuiltInit = {
            ...init,
            headers,
            body,
          };
        }
      } catch {}

      // Ensure headers are applied even if not rebuilding for Aimable URL
      try {
        const reqTypeFinal = getCurrentRequestType?.();
        const userNameFinal = getCurrentUserName?.();
        if (reqTypeFinal || userNameFinal) {
          const finalHeaders = {
            ...(rebuiltInit?.headers as any),
          } as Record<string, string>;
          if (reqTypeFinal && !finalHeaders["X-Request-Type"]) {
            finalHeaders["X-Request-Type"] = reqTypeFinal;
          }
          if (userNameFinal && !finalHeaders["X-Name"]) {
            finalHeaders["X-Name"] = userNameFinal;
          }
          rebuiltInit = {
            ...rebuiltInit,
            headers: finalHeaders,
          };
        }
      } catch {}

      const response = await fetch(input, rebuiltInit);

      // Store the routing details header globally for access by the API routes
      // Do this BEFORE any early returns (e.g., SSE filtering) so it is not skipped
      try {
        const routingDetailsEarly = response.headers.get("x-routing-details");
        if (routingDetailsEarly) {
          (globalThis as any).__lastRoutingDetails = routingDetailsEarly;
        }
        const alteredInputEarly = response.headers.get("x-altered-input");
        if (alteredInputEarly) {
          (globalThis as any).__lastAlteredInput = alteredInputEarly;
          try {
            console.log(
              "[AimableProxy][CAPTURED][SERVER] x-altered-input:",
              alteredInputEarly,
            );
          } catch {}
        }
      } catch {}

      // If streaming, Aimable may emit auxiliary events (e.g., {"event":"searching_uploaded_files"}).
      // Filter non-OpenAI-compatible SSE events so the AI SDK validator doesn't throw.
      try {
        const contentType = response.headers.get("content-type") || "";
        const isSse = /text\/event-stream/i.test(contentType);
        if (isSse && response.body) {
          const filtered = new ReadableStream<Uint8Array>({
            start(controller) {
              const reader = response.body!.getReader();
              const decoder = new TextDecoder();
              const encoder = new TextEncoder();
              let buffer = "";
              function pump(): any {
                return reader.read().then(({ done, value }) => {
                  if (done) {
                    // Flush remaining buffer
                    if (buffer.length > 0) {
                      processBuffer(true);
                    }
                    controller.close();
                    return;
                  }
                  try {
                    buffer += decoder.decode(value, { stream: true });
                    processBuffer(false);
                  } catch {}
                  return pump();
                });
              }
              function processBuffer(flush: boolean) {
                // Split by double newlines which delimit SSE events
                const parts = buffer.split(/\n\n/);
                const remain = flush ? "" : parts.pop() || "";
                for (const part of parts) {
                  const lines = part.split(/\n/);
                  const dataLines = lines.filter((l) => l.startsWith("data:"));
                  const passthrough = [] as string[];
                  for (const dl of dataLines) {
                    const raw = dl.slice(5).trimStart();
                    let skip = false;
                    try {
                      const json = JSON.parse(raw);
                      // Capture guardrail violations for later use (end-of-stream auxiliary event)
                      if (
                        json &&
                        Array.isArray(json.violated_output_guardrails)
                      ) {
                        try {
                          const violations = json.violated_output_guardrails;
                          const names = violations
                            .map((g: any) => g?.name)
                            .filter(Boolean);
                          if (violations.length > 0) {
                            (globalThis as any).__aimableLastGuardrails =
                              JSON.stringify(violations);
                          }
                          if (names.length > 0) {
                            (globalThis as any).__aimableLastGuardrailNames =
                              JSON.stringify(names);
                          }
                        } catch {}
                      }
                      // Capture violated policies for later use
                      if (json && Array.isArray(json.violated_policies)) {
                        try {
                          const policies = json.violated_policies;
                          if (policies.length > 0) {
                            (globalThis as any).__aimableLastViolatedPolicies =
                              JSON.stringify(policies);
                          }
                        } catch {}
                      }
                      // Keep only if it matches OpenAI-compatible chunks: has choices[] or error{}
                      const hasChoices = Array.isArray(json?.choices);
                      const hasError =
                        json &&
                        typeof json.error === "object" &&
                        json.error !== null;
                      // Drop known auxiliary events
                      if (!hasChoices && !hasError) {
                        skip = true;
                      }
                    } catch {
                      // non-JSON, pass through
                    }
                    if (!skip) {
                      passthrough.push(dl);
                    }
                  }
                  if (passthrough.length > 0) {
                    const rebuilt = passthrough.join("\n") + "\n\n";
                    controller.enqueue(encoder.encode(rebuilt));
                  }
                }
                buffer = remain;
              }
              pump();
            },
          });
          return new Response(filtered, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
      } catch {}

      // For non-SSE responses, attempt to detect guardrails at the end as well
      try {
        const contentType = response.headers.get("content-type") || "";
        const isSse = /text\/event-stream/i.test(contentType);
        if (!isSse) {
          // clone to avoid consuming the original stream
          const clone = response.clone();
          const text = await clone.text();
          try {
            const json = JSON.parse(text);
            if (json && Array.isArray(json.violated_output_guardrails)) {
              const violations = json.violated_output_guardrails;
              const names = violations.map((g: any) => g?.name).filter(Boolean);
              if (violations.length > 0) {
                (globalThis as any).__aimableLastGuardrails =
                  JSON.stringify(violations);
              }
              if (names.length > 0) {
                (globalThis as any).__aimableLastGuardrailNames =
                  JSON.stringify(names);
              }
            }
            if (json && Array.isArray(json.violated_policies)) {
              const policies = json.violated_policies;
              if (policies.length > 0) {
                (globalThis as any).__aimableLastViolatedPolicies =
                  JSON.stringify(policies);
              }
            }
          } catch {}
        }
      } catch {}

      // Routing details already stored above before early returns

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

/**
 * Altered input accessors
 */
export function getLastAlteredInput(): string | null {
  return (globalThis as any).__lastAlteredInput || null;
}
export function clearLastAlteredInput(): void {
  delete (globalThis as any).__lastAlteredInput;
}

/**
 * Guardrails accessors (names only)
 */
export function getLastGuardrailNames(): string | null {
  return (globalThis as any).__aimableLastGuardrailNames || null;
}
export function clearLastGuardrailNames(): void {
  delete (globalThis as any).__aimableLastGuardrailNames;
}

/**
 * Guardrails accessors (full objects)
 */
export function getLastGuardrails(): string | null {
  return (globalThis as any).__aimableLastGuardrails || null;
}
export function clearLastGuardrails(): void {
  delete (globalThis as any).__aimableLastGuardrails;
}

/**
 * Violated policies accessors
 */
export function getLastViolatedPolicies(): string | null {
  return (globalThis as any).__aimableLastViolatedPolicies || null;
}
export function clearLastViolatedPolicies(): void {
  delete (globalThis as any).__aimableLastViolatedPolicies;
}

// Simple async local storage to track current request type in server context
const requestTypeStorage = new AsyncLocalStorage<string | undefined>();
const userNameStorage = new AsyncLocalStorage<string | undefined>();

export function withRequestType<T>(
  type: string,
  fn: () => Promise<T>,
): Promise<T>;
export function withRequestType<T>(type: string, fn: () => T): T;
export function withRequestType<T>(
  type: string,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return requestTypeStorage.run(type, fn);
}

export function getCurrentRequestType(): string | undefined {
  return requestTypeStorage.getStore();
}

export function withUserName<T>(name: string, fn: () => Promise<T>): Promise<T>;
export function withUserName<T>(name: string, fn: () => T): T;
export function withUserName<T>(
  name: string,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return userNameStorage.run(name, fn);
}

export function getCurrentUserName(): string | undefined {
  return userNameStorage.getStore();
}
