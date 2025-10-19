import { NextRequest, NextResponse } from "next/server";
import { auth } from "auth/server";
import { requireAdminPermission } from "lib/auth/permissions";
import {
  updateUserDetailsAction,
  deleteUserAction,
  updateUserPasswordAction,
} from "../../../user/actions";
import {
  updateUserRolesAction,
  updateUserBanStatusAction,
} from "../../actions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permission
    await requireAdminPermission("update user in admin panel");

    const { id: userId } = await params;
    const body = await request.json();

    // Determine which action to call based on the fields in the request body
    let result;

    if (
      body.name !== undefined ||
      body.email !== undefined ||
      body.image !== undefined
    ) {
      // Update user details (name, email, image)
      const formData = new FormData();
      formData.append("userId", userId);
      if (body.name !== undefined) formData.append("name", body.name);
      if (body.email !== undefined) formData.append("email", body.email);
      if (body.image !== undefined) formData.append("image", body.image);

      result = await updateUserDetailsAction(
        { name: body.name, email: body.email, image: body.image },
        formData,
      );
    } else if (body.role !== undefined) {
      // Update user role
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("role", body.role);

      result = await updateUserRolesAction(
        { userId, role: body.role },
        formData,
      );
    } else if (body.banned !== undefined) {
      // Update ban status
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("banned", body.banned.toString());
      if (body.banReason) formData.append("banReason", body.banReason);

      result = await updateUserBanStatusAction(
        { userId, banned: body.banned.toString(), banReason: body.banReason },
        formData,
      );
    } else if (body.newPassword !== undefined) {
      // Update password
      const formData = new FormData();
      formData.append("newPassword", body.newPassword);
      if (body.currentPassword)
        formData.append("currentPassword", body.currentPassword);
      formData.append("isCurrentUser", "false");

      result = await updateUserPasswordAction(
        {
          newPassword: body.newPassword,
          currentPassword: body.currentPassword,
          isCurrentUser: false,
        },
        formData,
      );
    } else {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 },
      );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        user: result.user,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          error: result.error,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error in update user API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permission
    await requireAdminPermission("delete user in admin panel");

    const { id: userId } = await params;

    // Create FormData for the server action
    const formData = new FormData();
    formData.append("userId", userId);

    // Call the delete user server action
    const result = await deleteUserAction({ userId }, formData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        redirect: result.redirect,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          error: result.error,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error in delete user API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
