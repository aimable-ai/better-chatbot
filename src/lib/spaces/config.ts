export const SPACE_RETENTION_DAYS =
  Number(process.env.SPACE_RETENTION_DAYS) || 30;
export const SPACE_CLEANUP_BATCH_SIZE =
  Number(process.env.SPACE_CLEANUP_BATCH_SIZE) || 50;

export const SPACE_ERRORS = {
  WORKSPACE_NOT_FOUND: { code: 404, message: "Workspace not found" },
  WORKSPACE_ARCHIVED: {
    code: 423,
    message: "Workspace is archived and read-only",
  },
  WORKSPACE_DELETED: { code: 410, message: "Workspace has been deleted" },
  RETENTION_EXPIRED: {
    code: 400,
    message: "Cannot restore: retention period expired",
  },
  ALREADY_ARCHIVED: { code: 400, message: "Workspace is already archived" },
  ALREADY_DELETED: { code: 400, message: "Workspace is already deleted" },
} as const;

export type SpaceStatus = "active" | "archived" | "deleted";
