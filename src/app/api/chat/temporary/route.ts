import { redirect } from "next/navigation";
import { getSession } from "auth/server";
import {
  UIMessage,
  convertToModelMessages,
  smoothStream,
  streamText,
} from "ai";
import { customModelProvider } from "lib/ai/models";
import {
  getLastRoutingDetails,
  clearLastRoutingDetails,
  getLastAlteredInput,
  clearLastAlteredInput,
} from "lib/ai/aimable-provider";
import { setAimableOriginals } from "lib/ai/utils/aimable-files";
import globalLogger from "logger";
import { buildUserSystemPrompt } from "lib/ai/prompts";
import { userRepository } from "lib/db/repository";
import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Temporary Chat API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user.id) {
      return redirect("/sign-in");
    }

    const { messages, chatModel, instructions } = json as {
      messages: UIMessage[];
      chatModel?: {
        provider: string;
        model: string;
      };
      instructions?: string;
    };
    logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);
    const model = customModelProvider.getModel(chatModel);
    const userPreferences =
      (await userRepository.getPreferences(session.user.id)) || undefined;

    // Get routing and altered-input details from Aimable proxy if available
    const routingDetails = getLastRoutingDetails();
    const alteredInput = getLastAlteredInput?.() || null;

    // Capture originals for Aimable provider to build proper payload
    setAimableOriginals({ messages });

    const result = streamText({
      model,
      system: `${buildUserSystemPrompt(session.user, userPreferences)} ${
        instructions ? `\n\n${instructions}` : ""
      }`.trim(),
      messages: convertToModelMessages(messages),
      experimental_transform: smoothStream({ chunking: "word" }),
      onFinish: () => {
        // no-op here, handled by header below
      },
    });

    const response = result.toUIMessageStreamResponse();

    // Add routing details header if available
    if (routingDetails) {
      try {
        console.log(
          "[Temp Chat API][HEADERS] attaching x-routing-details:",
          routingDetails,
        );
      } catch {}
      response.headers.set("x-routing-details", routingDetails);
      response.headers.set(
        "Access-Control-Expose-Headers",
        alteredInput
          ? "x-routing-details, x-altered-input"
          : "x-routing-details",
      );
      clearLastRoutingDetails(); // Clear after use
    }

    // Add altered input header if available
    if (alteredInput) {
      try {
        console.log(
          "[Temp Chat API][HEADERS] attaching x-altered-input:",
          alteredInput,
        );
      } catch {}
      response.headers.set("x-altered-input", alteredInput);
      const existingExpose = response.headers.get(
        "Access-Control-Expose-Headers",
      );
      if (!existingExpose || !/x-altered-input/.test(existingExpose)) {
        response.headers.set(
          "Access-Control-Expose-Headers",
          existingExpose
            ? `${existingExpose}, x-altered-input`
            : "x-altered-input",
        );
      }
      clearLastAlteredInput?.();
    }

    return response;
  } catch (error: any) {
    logger.error(error);
    return new Response(error.message || "Oops, an error occured!", {
      status: 500,
    });
  }
}
