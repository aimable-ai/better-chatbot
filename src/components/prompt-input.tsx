"use client";

import {
  AudioWaveformIcon,
  ChevronDown,
  CornerRightUp,
  PlusIcon,
  Square,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "ui/button";
import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { SelectModel } from "./select-model";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { ChatMention, ChatModel } from "app-types/chat";
import dynamic from "next/dynamic";
import { ToolModeDropdown } from "./tool-mode-dropdown";

import { ToolSelectDropdown } from "./tool-select-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { useTranslations } from "next-intl";
import { Editor } from "@tiptap/react";
import { WorkflowSummary } from "app-types/workflow";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import equal from "lib/equal";
import { MCPIcon } from "ui/mcp-icon";
import { DefaultToolName } from "lib/ai/tools";
import { DefaultToolIcon } from "./default-tool-icon";
import { OpenAIIcon } from "ui/openai-icon";
import { GrokIcon } from "ui/grok-icon";
import { ClaudeIcon } from "ui/claude-icon";
import { GeminiIcon } from "ui/gemini-icon";

import { EMOJI_DATA } from "lib/const";
import { AgentSummary } from "app-types/agent";

interface PromptInputProps {
  placeholder?: string;
  setInput: (value: string) => void;
  input: string;
  onStop: () => void;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  toolDisabled?: boolean;
  isLoading?: boolean;
  model?: ChatModel;
  setModel?: (model: ChatModel) => void;
  voiceDisabled?: boolean;
  threadId?: string;
  disabledMention?: boolean;
  onFocus?: () => void;
  onUploadedFilesChange?: (
    files: Array<{
      id: string;
      name: string;
      type: string;
      progress: number;
      status: "uploading" | "done" | "error";
      sourceId?: string;
    }>,
  ) => void;
  onSubmitUploadedFiles?: (
    files: Array<{
      id: string;
      name: string;
      type: string;
      progress: number;
      status: "uploading" | "done" | "error";
      sourceId?: string;
    }>,
  ) => void;
}

const ChatMentionInput = dynamic(() => import("./chat-mention-input"), {
  ssr: false,
  loading() {
    return <div className="h-[2rem] w-full animate-pulse"></div>;
  },
});

export default function PromptInput({
  placeholder,
  sendMessage,
  model,
  setModel,
  input,
  onFocus,
  setInput,
  onStop,
  isLoading,
  toolDisabled,
  voiceDisabled,
  threadId,
  disabledMention,
  onUploadedFilesChange,
  onSubmitUploadedFiles,
}: PromptInputProps) {
  const t = useTranslations("Chat");

  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      id: string;
      name: string;
      type: string;
      progress: number; // 0-100
      status: "uploading" | "done" | "error";
      sourceId?: string; // Added sourceId for file operations
    }>
  >([]);

  useEffect(() => {
    onUploadedFilesChange?.(uploadedFiles);
  }, [uploadedFiles, onUploadedFilesChange]);

  const hasUploading = useMemo(() => {
    return uploadedFiles.some((f) => f.status === "uploading");
  }, [uploadedFiles]);

  const [globalModel, threadMentions, appStoreMutate] = appStore(
    useShallow((state) => [
      state.chatModel,
      state.threadMentions,
      state.mutate,
    ]),
  );

  const mentions = useMemo<ChatMention[]>(() => {
    if (!threadId) return [];
    return threadMentions[threadId!] ?? [];
  }, [threadMentions, threadId]);

  const chatModel = useMemo(() => {
    return model ?? globalModel;
  }, [model, globalModel]);

  const editorRef = useRef<Editor | null>(null);

  const setChatModel = useCallback(
    (model: ChatModel) => {
      if (setModel) {
        setModel(model);
      } else {
        appStoreMutate({ chatModel: model });
      }
    },
    [setModel, appStoreMutate],
  );

  const deleteMention = useCallback(
    (mention: ChatMention) => {
      if (!threadId) return;
      appStoreMutate((prev) => {
        const newMentions = mentions.filter((m) => !equal(m, mention));
        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: newMentions,
          },
        };
      });
    },
    [mentions, threadId],
  );

  const addMention = useCallback(
    (mention: ChatMention) => {
      if (!threadId) return;
      appStoreMutate((prev) => {
        if (mentions.some((m) => equal(m, mention))) return prev;

        const newMentions =
          mention.type == "agent"
            ? [...mentions.filter((m) => m.type !== "agent"), mention]
            : [...mentions, mention];

        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: newMentions,
          },
        };
      });
    },
    [mentions, threadId],
  );

  const onSelectWorkflow = useCallback(
    (workflow: WorkflowSummary) => {
      addMention({
        type: "workflow",
        name: workflow.name,
        icon: workflow.icon,
        workflowId: workflow.id,
        description: workflow.description,
      });
    },
    [addMention],
  );

  const onSelectAgent = useCallback(
    (agent: AgentSummary) => {
      appStoreMutate((prev) => {
        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: [
              {
                type: "agent",
                name: agent.name,
                icon: agent.icon,
                description: agent.description,
                agentId: agent.id,
              },
            ],
          },
        };
      });
    },
    [mentions, threadId],
  );

  const onChangeMention = useCallback(
    (mentions: ChatMention[]) => {
      let hasAgent = false;
      [...mentions]
        .reverse()
        .filter((m) => {
          if (m.type == "agent") {
            if (hasAgent) return false;
            hasAgent = true;
          }

          return true;
        })
        .reverse()
        .forEach(addMention);
    },
    [addMention],
  );

  const submit = () => {
    if (isLoading) return;
    const userMessage = input?.trim() || "";
    if (userMessage.length === 0) return;
    setInput("");

    // Prepare attachments from uploaded files
    const attachments = uploadedFiles
      .filter((f) => f.status === "done" && f.sourceId)
      .map((f) => ({
        filename: f.name,
        sourceId: f.sourceId!,
      }));

    // Prepare uploaded_files array with sourceIds
    const uploadedFilesList = uploadedFiles
      .filter((f) => f.status === "done" && f.sourceId)
      .map((f) => f.sourceId!);

    const clientFiles = uploadedFiles
      .filter((f) => f.status === "done" && f.sourceId)
      .map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        sourceId: f.sourceId!,
      }));

    console.log("📤 Sending message with files:");
    console.log("Attachments:", attachments);
    console.log("Uploaded Files:", uploadedFilesList);
    console.log("Message text:", userMessage);

    sendMessage({
      role: "user",
      parts: [
        {
          type: "text",
          text: userMessage,
        },
      ],
      metadata: {
        attachments: attachments.length > 0 ? attachments : undefined,
        uploaded_files:
          uploadedFilesList.length > 0 ? uploadedFilesList : undefined,
        client_files: clientFiles.length > 0 ? clientFiles : undefined,
      },
    });
    // Notify parent with the files that were included in this submit
    try {
      const submitted = uploadedFiles.filter((f) => f.status === "done");
      if (submitted.length > 0) {
        onSubmitUploadedFiles?.(submitted);
      } else {
        onSubmitUploadedFiles?.([]);
      }
    } catch {}

    // Clear uploaded files after sending
    setUploadedFiles([]);
  };

  // Handle ESC key to clear mentions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mentions.length > 0 && threadId) {
        e.preventDefault();
        e.stopPropagation();
        appStoreMutate((prev) => ({
          threadMentions: {
            ...prev.threadMentions,
            [threadId]: [],
          },
          agentId: undefined,
        }));
        editorRef.current?.commands.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mentions.length, threadId, appStoreMutate]);

  useEffect(() => {
    if (!editorRef.current) return;
  }, [editorRef.current]);

  return (
    <div className="max-w-3xl mx-auto fade-in animate-in">
      <div className="z-10 mx-auto w-full max-w-3xl relative">
        <fieldset className="flex w-full min-w-0 max-w-full flex-col px-4">
          <div className="shadow-lg overflow-hidden rounded-4xl backdrop-blur-sm transition-all duration-200 bg-muted/60 relative flex w-full flex-col cursor-text z-10 items-stretch focus-within:bg-muted hover:bg-muted focus-within:ring-muted hover:ring-muted">
            {mentions.length > 0 && (
              <div className="bg-input rounded-b-sm rounded-t-3xl p-3 flex flex-col gap-4 mx-2 my-2">
                {mentions.map((mention, i) => {
                  return (
                    <div key={i} className="flex items-center gap-2">
                      {mention.type === "workflow" ||
                      mention.type === "agent" ? (
                        <Avatar
                          className="size-6 p-1 ring ring-border rounded-full flex-shrink-0"
                          style={mention.icon?.style}
                        >
                          <AvatarImage
                            src={
                              mention.icon?.value ||
                              EMOJI_DATA[i % EMOJI_DATA.length]
                            }
                          />
                          <AvatarFallback>{mention.name}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <Button className="size-6 flex items-center justify-center ring ring-border rounded-full flex-shrink-0 p-0.5">
                          {mention.type == "mcpServer" ? (
                            <MCPIcon className="size-3.5" />
                          ) : (
                            <DefaultToolIcon
                              name={mention.name as DefaultToolName}
                              className="size-3.5"
                            />
                          )}
                        </Button>
                      )}

                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-semibold truncate">
                          {mention.name}
                        </span>
                        {mention.description ? (
                          <span className="text-muted-foreground text-xs truncate">
                            {mention.description}
                          </span>
                        ) : null}
                      </div>
                      <Button
                        variant={"ghost"}
                        size={"icon"}
                        disabled={!threadId}
                        className="rounded-full hover:bg-input! flex-shrink-0"
                        onClick={() => {
                          deleteMention(mention);
                        }}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {uploadedFiles.length > 0 && (
              <div className="px-5 pt-2">
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file, _idx) => (
                    <div
                      key={file.id}
                      className="group relative flex items-center gap-2 pl-3 pr-2 py-2 rounded-md bg-white border border-neutral-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                      title={file.name}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-500 text-white border border-blue-500 shadow-sm">
                        <svg
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          fill="currentColor"
                          className="remixicon text-white"
                        >
                          <path d="M21 9V20.9925C21 21.5511 20.5552 22 20.0066 22H3.9934C3.44495 22 3 21.556 3 21.0082V2.9918C3 2.45531 3.44694 2 3.99826 2H14V8C14 8.55228 14.4477 9 15 9H21ZM21 7H16V2.00318L21 7ZM8 7V9H11V7H8ZM8 11V13H16V11H8ZM8 15V17H16V15H8Z"></path>
                        </svg>
                      </div>
                      <div className="flex flex-col leading-tight pr-1 w-32">
                        <span className="text-xs font-medium text-neutral-800 truncate">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {file.type || "file"}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove file"
                        className="ml-1 text-neutral-500 hover:text-neutral-900 text-xl leading-none px-1 rounded transition-colors"
                        onClick={async () => {
                          try {
                            // Call local DELETE endpoint with sourceId if available
                            if (file.sourceId) {
                              const response = await fetch("/api/files", {
                                method: "DELETE",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  source_ids: [file.sourceId],
                                }),
                              });

                              if (!response.ok) {
                                console.error(
                                  "Delete failed",
                                  await response.text(),
                                );
                              }
                            }
                          } catch (error) {
                            console.error("Error deleting file:", error);
                          } finally {
                            // Remove from UI regardless of API success/failure
                            setUploadedFiles((prev) =>
                              prev.filter((f) => f.id !== file.id),
                            );
                          }
                        }}
                      >
                        ×
                      </button>
                      <div className="absolute left-0 bottom-0 h-0.5 w-full bg-neutral-100">
                        <div
                          className={`h-full ${
                            file.status === "error"
                              ? "bg-red-500"
                              : file.status === "done"
                                ? "bg-green-500"
                                : "bg-blue-500"
                          } transition-[width] duration-200`}
                          style={{
                            width: `${Math.max(0, Math.min(100, file.progress))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3.5 px-5 pt-2 pb-4">
              <div className="relative min-h-[2rem]">
                <ChatMentionInput
                  input={input}
                  onChange={setInput}
                  onChangeMention={onChangeMention}
                  onEnter={submit}
                  placeholder={placeholder ?? t("placeholder")}
                  ref={editorRef}
                  disabledMention={disabledMention}
                  onFocus={onFocus}
                />
              </div>
              <div className="flex w-full items-center z-30">
                <Button
                  variant={"ghost"}
                  size={"sm"}
                  className="rounded-full hover:bg-input! p-2!"
                  onClick={async () => {
                    try {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.multiple = true;

                      input.onchange = async () => {
                        const files = input.files;
                        if (!files || files.length === 0) return;

                        // Add to preview list and kick off uploads with progress
                        const filesArray = Array.from(files);
                        const newItems = filesArray.map((f) => ({
                          id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                          name: f.name,
                          type:
                            f.type?.split("/").pop() ||
                            f.name.split(".").pop() ||
                            "file",
                          progress: 0,
                          status: "uploading" as const,
                        }));
                        setUploadedFiles((prev) => [...prev, ...newItems]);

                        // For reliable upload progress, use XMLHttpRequest per file
                        filesArray.forEach((file, i) => {
                          const item = newItems[i];
                          const formData = new FormData();
                          formData.append("files", file);

                          const xhr = new XMLHttpRequest();
                          xhr.open("POST", "/api/files", true);

                          xhr.upload.onprogress = (evt) => {
                            if (!evt.lengthComputable) return;
                            const percent = Math.round(
                              (evt.loaded / evt.total) * 100,
                            );
                            setUploadedFiles((prev) =>
                              prev.map((f) =>
                                f.id === item.id
                                  ? { ...f, progress: percent }
                                  : f,
                              ),
                            );
                          };

                          xhr.onload = () => {
                            const ok = xhr.status >= 200 && xhr.status < 300;
                            if (ok) {
                              try {
                                const response = JSON.parse(xhr.responseText);
                                const filesProcessed =
                                  response.files_processed || {};
                                const sourceId = filesProcessed[file.name];

                                setUploadedFiles((prev) =>
                                  prev.map((f) =>
                                    f.id === item.id
                                      ? {
                                          ...f,
                                          progress: 100,
                                          status: "done",
                                          sourceId: sourceId,
                                        }
                                      : f,
                                  ),
                                );
                              } catch (error) {
                                console.error(
                                  "Error parsing upload response:",
                                  error,
                                );
                                setUploadedFiles((prev) =>
                                  prev.map((f) =>
                                    f.id === item.id
                                      ? { ...f, status: "error" }
                                      : f,
                                  ),
                                );
                              }
                            } else {
                              setUploadedFiles((prev) =>
                                prev.map((f) =>
                                  f.id === item.id
                                    ? { ...f, status: "error" }
                                    : f,
                                ),
                              );
                            }
                          };

                          xhr.onerror = () => {
                            setUploadedFiles((prev) =>
                              prev.map((f) =>
                                f.id === item.id
                                  ? { ...f, status: "error" }
                                  : f,
                              ),
                            );
                          };

                          xhr.send(formData);
                        });
                      };

                      input.click();
                    } catch (error) {
                      console.error(error);
                    }
                  }}
                >
                  <PlusIcon />
                </Button>

                {!toolDisabled && (
                  <>
                    <ToolModeDropdown />
                    <ToolSelectDropdown
                      className="mx-1"
                      align="start"
                      side="top"
                      onSelectWorkflow={onSelectWorkflow}
                      onSelectAgent={onSelectAgent}
                      mentions={mentions}
                    />
                  </>
                )}

                <div className="flex-1" />

                <SelectModel onSelect={setChatModel} currentModel={chatModel}>
                  <Button
                    variant={"ghost"}
                    size={"sm"}
                    className="rounded-full group data-[state=open]:bg-input! hover:bg-input! mr-1"
                    data-testid="model-selector-button"
                  >
                    {chatModel?.model ? (
                      <>
                        {chatModel.provider === "openai" ? (
                          <OpenAIIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : chatModel.provider === "xai" ? (
                          <GrokIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : chatModel.provider === "anthropic" ? (
                          <ClaudeIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : chatModel.provider === "google" ? (
                          <GeminiIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : null}
                        <span
                          className="text-foreground group-data-[state=open]:text-foreground  "
                          data-testid="selected-model-name"
                        >
                          {chatModel.model}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">model</span>
                    )}

                    <ChevronDown className="size-3" />
                  </Button>
                </SelectModel>
                {!isLoading && !input.length && !voiceDisabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size={"sm"}
                        onClick={() => {
                          appStoreMutate((state) => ({
                            voiceChat: {
                              ...state.voiceChat,
                              isOpen: true,
                              agentId: undefined,
                            },
                          }));
                        }}
                        className="rounded-full p-2!"
                      >
                        <AudioWaveformIcon size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("VoiceChat.title")}</TooltipContent>
                  </Tooltip>
                ) : (
                  <div
                    role="button"
                    aria-disabled={hasUploading}
                    onClick={() => {
                      if (isLoading) {
                        onStop();
                      } else if (!hasUploading) {
                        submit();
                      }
                    }}
                    className={`fade-in animate-in rounded-full p-2 transition-all duration-200 ${
                      hasUploading
                        ? "opacity-50 cursor-not-allowed text-muted-foreground bg-secondary"
                        : "cursor-pointer text-muted-foreground bg-secondary hover:bg-accent-foreground hover:text-accent"
                    }`}
                  >
                    {isLoading ? (
                      <Square
                        size={16}
                        className="fill-muted-foreground text-muted-foreground"
                      />
                    ) : (
                      <CornerRightUp size={16} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
