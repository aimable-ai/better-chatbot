import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
  UIMessage,
} from "ai";

import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";
import {
  getLastRoutingDetails,
  clearLastRoutingDetails,
  getLastAlteredInput,
  clearLastAlteredInput,
  getLastGuardrailNames,
  clearLastGuardrailNames,
  getLastGuardrails,
  clearLastGuardrails,
  getLastViolatedPolicies,
  clearLastViolatedPolicies,
} from "lib/ai/aimable-provider";
import { setAimableOriginals } from "lib/ai/utils/aimable-files";

import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";

import { agentRepository, chatRepository } from "lib/db/repository";
import globalLogger from "logger";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildUserSystemPrompt,
  buildToolCallUnsupportedModelSystemPrompt,
} from "lib/ai/prompts";
import { chatApiSchemaRequestBodySchema, ChatMetadata } from "app-types/chat";

import { validateUserAccessToCurrentSpace } from "lib/spaces/current-space";

import { errorIf, safe } from "ts-safe";

import {
  excludeToolExecution,
  handleError,
  manualToolExecuteByLastMessage,
  mergeSystemPrompt,
  extractInProgressToolPart,
  filterMcpServerCustomizations,
  loadMcpTools,
  loadWorkFlowTools,
  loadAppDefaultTools,
  convertToSavePart,
} from "./shared.chat";
import {
  rememberAgentAction,
  rememberMcpServerCustomizationsAction,
} from "./actions";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import { generateUUID } from "lib/utils";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Chat API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { spaceId } = await validateUserAccessToCurrentSpace();
    if (!spaceId) {
      return new Response("Space required", { status: 400 });
    }

    const {
      id,
      message,
      chatModel,
      toolChoice,
      allowedAppDefaultToolkit,
      allowedMcpServers,
      mentions = [],
    } = chatApiSchemaRequestBodySchema.parse(json);

    // Extract attachments and uploaded_files from message metadata
    const attachments = (message.metadata as any)?.attachments || [];
    const uploaded_files = (message.metadata as any)?.uploaded_files || [];

    const model = customModelProvider.getModel(chatModel);

    let thread = await chatRepository.selectThreadDetails(id, spaceId);

    if (!thread) {
      logger.info(`create chat thread: ${id}`);
      const newThread = await chatRepository.insertThread({
        id,
        title: "",
        userId: session.user.id,
        spaceId,
      });
      thread = await chatRepository.selectThreadDetails(newThread.id, spaceId);
    }

    if (thread!.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const messages: UIMessage[] = (thread?.messages ?? []).map((m) => {
      return {
        id: m.id,
        role: m.role,
        parts: m.parts,
        metadata: m.metadata,
      };
    });

    if (messages.at(-1)?.id == message.id) {
      messages.pop();
    }

    // Add attachments to the message if they exist (do not place uploaded_files inside message)
    const messageWithFiles = {
      ...message,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    messages.push(messageWithFiles);

    const supportToolCall = !isToolCallUnsupportedModel(model);

    const agentId = mentions.find((m) => m.type === "agent")?.agentId;

    const agent = await rememberAgentAction(agentId, session.user.id);

    if (agent?.instructions?.mentions) {
      mentions.push(...agent.instructions.mentions);
    }

    const isToolCallAllowed =
      supportToolCall && (toolChoice != "none" || mentions.length > 0);

    const metadata: ChatMetadata = {
      agentId: agent?.id,
      toolChoice: toolChoice,
      toolCount: 0,
      chatModel: chatModel,
    };

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const mcpClients = await mcpClientsManager.getClients();
        const mcpTools = await mcpClientsManager.tools();
        logger.info(
          `mcp-server count: ${mcpClients.length}, mcp-tools count :${Object.keys(mcpTools).length}`,
        );
        const MCP_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadMcpTools({
              mentions,
              allowedMcpServers,
            }),
          )
          .orElse({});

        const WORKFLOW_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadWorkFlowTools({
              mentions,
              dataStream,
            }),
          )
          .orElse({});

        const APP_DEFAULT_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadAppDefaultTools({
              mentions,
              allowedAppDefaultToolkit,
            }),
          )
          .orElse({});
        const inProgressToolParts = extractInProgressToolPart(message);
        if (inProgressToolParts.length) {
          await Promise.all(
            inProgressToolParts.map(async (part) => {
              const output = await manualToolExecuteByLastMessage(
                part,
                { ...MCP_TOOLS, ...WORKFLOW_TOOLS, ...APP_DEFAULT_TOOLS },
                request.signal,
              );
              part.output = output;

              dataStream.write({
                type: "tool-output-available",
                toolCallId: part.toolCallId,
                output,
              });
            }),
          );
        }

        const userPreferences = thread?.userPreferences || undefined;

        const mcpServerCustomizations = await safe()
          .map(() => {
            if (Object.keys(MCP_TOOLS ?? {}).length === 0)
              throw new Error("No tools found");
            return rememberMcpServerCustomizationsAction(session.user.id);
          })
          .map((v) => filterMcpServerCustomizations(MCP_TOOLS!, v))
          .orElse({});

        const systemPrompt = mergeSystemPrompt(
          buildUserSystemPrompt(session.user, userPreferences, agent),
          buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
          !supportToolCall && buildToolCallUnsupportedModelSystemPrompt,
        );

        const vercelAITooles = safe({ ...MCP_TOOLS, ...WORKFLOW_TOOLS })
          .map((t) => {
            const bindingTools =
              toolChoice === "manual" ||
              (message.metadata as ChatMetadata)?.toolChoice === "manual"
                ? excludeToolExecution(t)
                : t;
            return {
              ...bindingTools,
              ...APP_DEFAULT_TOOLS, // APP_DEFAULT_TOOLS Not Supported Manual
            };
          })
          .unwrap();
        metadata.toolCount = Object.keys(vercelAITooles).length;

        const allowedMcpTools = Object.values(allowedMcpServers ?? {})
          .map((t) => t.tools)
          .flat();

        logger.info(
          `${agent ? `agent: ${agent.name}, ` : ""}tool mode: ${toolChoice}, mentions: ${mentions.length}`,
        );

        logger.info(
          `allowedMcpTools: ${allowedMcpTools.length ?? 0}, allowedAppDefaultToolkit: ${allowedAppDefaultToolkit?.length ?? 0}`,
        );
        logger.info(
          `binding tool count APP_DEFAULT: ${Object.keys(APP_DEFAULT_TOOLS ?? {}).length}, MCP: ${Object.keys(MCP_TOOLS ?? {}).length}, Workflow: ${Object.keys(WORKFLOW_TOOLS ?? {}).length}`,
        );
        logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);

        // Make original messages and explicit uploaded_files available to Aimable provider
        setAimableOriginals({ messages, uploaded_files });

        const result = streamText({
          model,
          system: systemPrompt,
          messages: convertToModelMessages(messages),
          experimental_transform: smoothStream({ chunking: "word" }),
          maxRetries: 2,
          tools: vercelAITooles,
          stopWhen: stepCountIs(10),
          toolChoice: "auto",
          abortSignal: request.signal,
        });
        result.consumeStream();
        dataStream.merge(
          result.toUIMessageStream({
            messageMetadata: ({ part }) => {
              if (part.type == "finish") {
                metadata.usage = part.totalUsage;
                // Capture per-response routing header and persist into this message's metadata
                try {
                  const routingDetails = getLastRoutingDetails();
                  if (routingDetails) {
                    const parsed = JSON.parse(routingDetails);
                    metadata.trusted = !!parsed?.use_trusted_model;
                  }
                  const guardrailNamesJson = getLastGuardrailNames();
                  if (guardrailNamesJson) {
                    const names = JSON.parse(guardrailNamesJson);
                    if (Array.isArray(names) && names.length > 0) {
                      metadata.guardrailNames = names;
                    }
                  }
                  const guardrailsJson = getLastGuardrails();
                  if (guardrailsJson) {
                    const violationsRaw = JSON.parse(guardrailsJson);
                    if (
                      Array.isArray(violationsRaw) &&
                      violationsRaw.length > 0
                    ) {
                      const violations = violationsRaw
                        .map((v: any) => {
                          const name = v?.name;
                          // Collect any human-readable policy texts if present
                          const violatedPolicies = Array.isArray(
                            v?.violated_policies,
                          )
                            ? v.violated_policies
                            : [];
                          const policyTexts: string[] = [];
                          for (const p of violatedPolicies) {
                            const t = p?.text ?? p?.message ?? p?.reason;
                            if (typeof t === "string" && t.trim().length > 0) {
                              policyTexts.push(t.trim());
                            }
                          }
                          const reason =
                            policyTexts.length > 0
                              ? policyTexts.join("\n\n")
                              : undefined;
                          if (typeof name === "string") {
                            return { name, reason };
                          }
                          return null;
                        })
                        .filter(Boolean);
                      if (violations.length > 0) {
                        (metadata as any).guardrails = violations;
                      }
                    }
                  }
                  // Capture violated policies separately
                  const violatedPoliciesJson = getLastViolatedPolicies();
                  if (violatedPoliciesJson) {
                    const policies = JSON.parse(violatedPoliciesJson);
                    if (Array.isArray(policies) && policies.length > 0) {
                      (metadata as any).violatedPolicies = policies;
                    }
                  }
                  // Capture altered input for the user message
                  const alteredInput = getLastAlteredInput();
                  if (alteredInput) {
                    (metadata as any).alteredInput = alteredInput;
                    console.log(
                      "[Chat API][METADATA] Storing altered input in metadata:",
                      alteredInput,
                    );
                  }
                } catch {}
                return metadata;
              }
            },
          }),
        );
      },

      generateId: generateUUID,
      onFinish: async ({ responseMessage }) => {
        // Update user message with altered input if available
        const alteredInput = getLastAlteredInput();
        let userMessageToSave = message;
        if (alteredInput) {
          console.log(
            "[Chat API][ONFINISH] Updating user message with altered input:",
            alteredInput,
          );
          userMessageToSave = {
            ...message,
            parts: message.parts.map((p) =>
              p.type === "text" ? { ...p, text: alteredInput } : p,
            ),
          };
        }

        if (responseMessage.id == message.id) {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            ...responseMessage,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        } else {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: userMessageToSave.role,
            parts: userMessageToSave.parts.map(convertToSavePart),
            id: userMessageToSave.id,
          });
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: responseMessage.role,
            id: responseMessage.id,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        }

        if (agent) {
          agentRepository.updateAgent(agent.id, session.user.id, {
            updatedAt: new Date(),
          } as any);
        }
      },
      onError: handleError,
      originalMessages: messages,
    });

    // Get routing and altered-input details from Aimable proxy if available
    const routingDetails = getLastRoutingDetails();
    const alteredInput = getLastAlteredInput();
    const guardrailNamesJson = getLastGuardrailNames();

    const response = createUIMessageStreamResponse({
      stream,
    });

    // Add routing details header if available
    if (routingDetails) {
      try {
        console.log(
          "[Chat API][HEADERS] attaching x-routing-details:",
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
          "[Chat API][HEADERS] attaching x-altered-input:",
          alteredInput,
        );
      } catch {}
      response.headers.set("x-altered-input", alteredInput);
      // ensure exposed even if routingDetails branch didn't run
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
      clearLastAlteredInput();
    }

    // Clear guardrail names after attaching to metadata
    if (guardrailNamesJson) clearLastGuardrailNames();
    const guardrailsJson = getLastGuardrails();
    if (guardrailsJson) clearLastGuardrails();
    const violatedPoliciesJson = getLastViolatedPolicies();
    if (violatedPoliciesJson) clearLastViolatedPolicies();

    return response;
  } catch (error: any) {
    logger.error(error);
    return Response.json({ message: error.message }, { status: 500 });
  }
}
