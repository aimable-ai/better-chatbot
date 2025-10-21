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
import { spacesRepository } from "lib/spaces/repository";

// Helper function to create a personal space for a user
async function createPersonalSpaceForUser(userId: string) {
  try {
    // Create the personal space with isPersonal=true
    const personalSpace = await spacesRepository.createSpace("My Personal Space", { isPersonal: true });
    
    // Add user as owner of the space
    await spacesRepository.upsertMember(personalSpace.id, userId, "owner");
    
    return personalSpace;
  } catch (error) {
    logger.error("Failed to create personal space for user:", error);
    throw new Error("Failed to create personal space");
  }
}

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

      // Use Better Auth's admin API to create user with proper password hashing
      // This bypasses the disableSignUp restriction for admin-created users
      const { user: newUser } = await auth.api.createUser({
        body: {
          email,
          password,
          name,
          role: targetRole,
        },
        headers: await headers(),
      });

      if (!newUser) {
        throw new Error("User creation failed");
      }

      // Get updated user data
      const createdUser = await getUser(newUser.id);

      // Create personal space for the new user
      let personalSpace: Awaited<ReturnType<typeof spacesRepository.createSpace>> | null = null;
      try {
        personalSpace = await createPersonalSpaceForUser(newUser.id);
        logger.info(`Created personal space for user ${newUser.id}: ${personalSpace.id}`);
      } catch (spaceError) {
        logger.error("Failed to create personal space, but user was created successfully:", spaceError);
        // Don't fail the entire operation if space creation fails
        // The space will be created later when the user creates their first content
      }

      return {
        success: true,
        message: t("userCreatedSuccessfully", {
          name: createdUser?.name || name,
          role: userRolesInfo[targetRole].label,
        }),
        user: createdUser,
        personalSpace,
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
