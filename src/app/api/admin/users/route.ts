import { NextRequest, NextResponse } from "next/server";
import { createUserAction } from "../../admin/actions";
import { auth } from "auth/server";
import { getAdminUsers } from "lib/admin/server";
import { requireAdminPermission } from "lib/auth/permissions";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permission
    await requireAdminPermission("list users in admin panel");

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const query = searchParams.get("query") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDirection =
      (searchParams.get("sortDirection") as "asc" | "desc") || "desc";

    const offset = (page - 1) * limit;

    // Get users using the existing admin function
    const result = await getAdminUsers({
      searchValue: query,
      searchField: "email",
      searchOperator: "contains",
      limit,
      offset,
      sortBy,
      sortDirection,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in get users API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permission
    const isAdmin = session.user.role?.split(",").includes("admin");
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.name || !body.password) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, password" },
        { status: 400 },
      );
    }

    // Create FormData object for the server action
    const formData = new FormData();
    formData.append("email", body.email);
    formData.append("name", body.name);
    formData.append("password", body.password);
    if (body.role) {
      formData.append("role", body.role);
    }

    // Call the server action
    const result = await createUserAction({}, formData);

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
    console.error("Error in user creation API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
