"use server";

import { validatedActionWithAdminPermission } from "lib/action-utils";
import { headers } from "next/headers";
import { auth } from "auth/server";
import { DEFAULT_USER_ROLE, userRolesInfo } from "app-types/roles";
import {
  UpdateUserRoleSchema,
  UpdateUserRoleActionState,
  UpdateUserBanStatusSchema,
  UpdateUserBanStatusActionState,
  CreateUserSchema,
  CreateUserActionState,
} from "./validations";
import logger from "lib/logger";
import { getTranslations } from "next-intl/server";
import { getUser } from "lib/user/server";
import { userRepository } from "lib/db/repository";
import { hash } from "bcrypt-ts";
import { pgDb } from "lib/db/pg/db.pg";
import { UserSchema } from "lib/db/pg/schema.pg";

export const updateUserRolesAction = validatedActionWithAdminPermission(
  UpdateUserRoleSchema,
  async (data, _formData, userSession): Promise<UpdateUserRoleActionState> => {
    const t = await getTranslations("Admin.UserRoles");
    const tCommon = await getTranslations("User.Profile.common");
    const { userId, role: roleInput } = data;

    const role = roleInput || DEFAULT_USER_ROLE;
    if (userSession.user.id === userId) {
      return {
        success: false,
        message: t("cannotUpdateOwnRole"),
      };
    }
    await auth.api.setRole({
      body: { userId, role },
      headers: await headers(),
    });
    await auth.api.revokeUserSessions({
      body: { userId },
      headers: await headers(),
    });
    const user = await getUser(userId);
    if (!user) {
      return {
        success: false,
        message: tCommon("userNotFound"),
      };
    }

    return {
      success: true,
      message: t("roleUpdatedSuccessfullyTo", {
        role: userRolesInfo[role].label,
      }),
      user,
    };
  },
);

export const updateUserBanStatusAction = validatedActionWithAdminPermission(
  UpdateUserBanStatusSchema,
  async (
    data,
    _formData,
    userSession,
  ): Promise<UpdateUserBanStatusActionState> => {
    const tCommon = await getTranslations("User.Profile.common");
    const { userId, banned, banReason } = data;

    if (userSession.user.id === userId) {
      return {
        success: false,
        message: tCommon("cannotBanUnbanYourself"),
      };
    }
    try {
      if (!banned) {
        await auth.api.banUser({
          body: {
            userId,
            banReason:
              banReason ||
              (await getTranslations("User.Profile.common"))("bannedByAdmin"),
          },
          headers: await headers(),
        });
        await auth.api.revokeUserSessions({
          body: { userId },
          headers: await headers(),
        });
      } else {
        await auth.api.unbanUser({
          body: { userId },
          headers: await headers(),
        });
      }
      const user = await getUser(userId);
      if (!user) {
        return {
          success: false,
          message: tCommon("userNotFound"),
        };
      }
      return {
        success: true,
        message: user.banned
          ? tCommon("userBannedSuccessfully")
          : tCommon("userUnbannedSuccessfully"),
        user,
      };
    } catch (error) {
      logger.error(error);
      return {
        success: false,
        message: tCommon("failedToUpdateUserStatus"),
        error: error instanceof Error ? error.message : tCommon("unknownError"),
      };
    }
  },
);

export const createUserAction = validatedActionWithAdminPermission(
  CreateUserSchema,
  async (data, _formData, _userSession): Promise<CreateUserActionState> => {
    const t = await getTranslations("Admin.UserCreate");
    const { email, name, password, role } = data;

    try {
      // Check if user already exists
      const existingUser = await userRepository.existsByEmail(email);
      if (existingUser) {
        return {
          success: false,
          message: t("userAlreadyExists"),
        };
      }

      // Determine target role upfront
      const targetRole = role || DEFAULT_USER_ROLE;

      // Hash the password
      const hashedPassword = await hash(password, 12);

      // Create user directly in database (bypasses disableSignUp restriction)
      const [newUser] = await pgDb
        .insert(UserSchema)
        .values({
          email,
          name,
          password: hashedPassword,
          role: targetRole,
          emailVerified: true, // Admin-created users are pre-verified
        })
        .returning();

      const user = newUser;

      // Get updated user data
      const createdUser = await getUser(user.id);

      return {
        success: true,
        message: t("userCreatedSuccessfully", {
          name: createdUser?.name || name,
          role: userRolesInfo[targetRole].label,
        }),
        user: createdUser,
      };
    } catch (error) {
      logger.error("Failed to create user:", error);
      return {
        success: false,
        message: t("failedToCreateUser"),
        error: error instanceof Error ? error.message : t("unknownError"),
      };
    }
  },
);
