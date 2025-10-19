import { z } from "zod";
import { USER_ROLES, UserRoleNames } from "app-types/roles";

import { ActionState } from "lib/action-utils";
import { BasicUserWithLastLogin } from "app-types/user";

export const UpdateUserRoleSchema = z.object({
  userId: z.uuid("Invalid user ID"),
  role: z
    .enum(Object.values(USER_ROLES) as [UserRoleNames, ...UserRoleNames[]])
    .optional(),
});

export const UpdateUserBanStatusSchema = z.object({
  userId: z.uuid("Invalid user ID"),
  banned: z.enum(["true", "false"]).transform((value) => value === "true"),
  banReason: z.string().optional(),
});

export const CreateUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z
    .enum(Object.values(USER_ROLES) as [UserRoleNames, ...UserRoleNames[]])
    .optional()
    .default(USER_ROLES.USER),
});

export type UpdateUserRoleActionState = ActionState & {
  user?: BasicUserWithLastLogin | null;
};

export type UpdateUserBanStatusActionState = ActionState & {
  user?: BasicUserWithLastLogin | null;
};

export type CreateUserActionState = ActionState & {
  user?: BasicUserWithLastLogin | null;
};
