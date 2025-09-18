export interface AimableChatPayload {
  messages: any[];
  stream?: boolean;
  trusted_model_override?: string | null;
  uploaded_files: string[];
}

export function collectUploadedFiles(
  originalMessages: any[] | undefined,
  explicitUploadedFiles: string[] | undefined,
): string[] {
  const fromAttachments = (originalMessages ?? [])
    .flatMap((m) => m?.attachments ?? [])
    .map((a: any) => a?.sourceId)
    .filter(Boolean);
  const explicit = explicitUploadedFiles ?? [];
  return Array.from(
    new Set([...(explicit as string[]), ...(fromAttachments as string[])]),
  );
}

export function setAimableOriginals(options: {
  messages?: any[];
  uploaded_files?: string[];
}) {
  (globalThis as any).__aimableOriginalMessages = options.messages;
  (globalThis as any).__aimableExplicitUploadedFiles = options.uploaded_files;
}

export function clearAimableOriginals() {
  delete (globalThis as any).__aimableOriginalMessages;
  delete (globalThis as any).__aimableExplicitUploadedFiles;
}
