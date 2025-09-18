export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.AIMABLE_PROXY_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AIMABLE_PROXY_API_KEY is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const formData = await request.formData();

    // Normalize to 'files' for upstream, accept 'file' or 'files' from client
    const hasSingle = formData.has("file");
    const hasMultiple = formData.has("files");
    if (!hasSingle && !hasMultiple) {
      return new Response(
        JSON.stringify({ error: "Missing 'file' or 'files' in form-data" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const forward = new FormData();
    // Copy non-file fields and normalize file fields
    for (const [key, value] of formData.entries()) {
      if (key === "files") {
        forward.append("files", value as any);
      } else if (key === "file") {
        forward.append("files", value as any);
      } else {
        forward.append(key, value as any);
      }
    }

    const upstream = await fetch("https://demo.aimable.ai/api/v1/files/", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: forward,
    });

    const contentType =
      upstream.headers.get("content-type") || "application/json";
    const text = await upstream.text();

    // Log the raw response from Aimable proxy
    console.log("🔍 Aimable Proxy Response:");
    console.log("Status:", upstream.status);
    console.log("Content-Type:", contentType);
    console.log("Raw Response:", text);

    // Parse the upstream response to extract file mappings
    if (upstream.ok && contentType.includes("application/json")) {
      try {
        const upstreamData = JSON.parse(text);
        console.log(
          "📄 Parsed Response Data:",
          JSON.stringify(upstreamData, null, 2),
        );

        // Transform the response to match demo format
        const transformedResponse = {
          files_processed: upstreamData.files_processed || {},
        };

        console.log(
          "🔄 Transformed Response:",
          JSON.stringify(transformedResponse, null, 2),
        );

        return new Response(JSON.stringify(transformedResponse), {
          status: upstream.status,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error parsing upstream response:", error);
        // Fall back to original response
      }
    }

    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (error: any) {
    const message =
      typeof error?.message === "string" ? error.message : "Upload failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const apiKey = process.env.AIMABLE_PROXY_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AIMABLE_PROXY_API_KEY is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await request.json();
    const { source_ids } = body;

    if (!source_ids || !Array.isArray(source_ids) || source_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing source_ids array" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const upstream = await fetch("https://demo.aimable.ai/api/v1/files/", {
      method: "DELETE",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source_ids }),
    });

    const contentType =
      upstream.headers.get("content-type") || "application/json";
    const text = await upstream.text();

    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (error: any) {
    const message =
      typeof error?.message === "string" ? error.message : "Delete failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
