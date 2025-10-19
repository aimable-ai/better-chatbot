# Admin User Creation Server Action

## Overview

The `createUserAction` server action allows administrators to create new users with specific roles through the Better Auth system.

## Usage

### Server Action

```typescript
import { createUserAction } from "@/app/api/admin/actions";

// Example usage in a form component
const [_, createUserFormAction] = useActionState<CreateUserActionState, FormData>(
  async (_prevState, formData) => {
    const result = await createUserAction({}, formData);
    
    if (result?.success) {
      toast.success(result.message);
      router.refresh(); // Refresh user list
      setShowDialog(false);
    } else {
      toast.error(result?.message || "Failed to create user");
    }
    return result;
  },
  {},
);
```

### Form Data Structure

The server action expects the following form data:

- `email`: User's email address (required, must be valid email)
- `name`: User's display name (required, minimum 1 character)
- `password`: User's password (required, minimum 8 characters)
- `role`: User's role (optional, defaults to "user")

### Available Roles

- `admin`: Full system access
- `editor`: Can create and manage content
- `user`: Basic user access (default)

### Response Structure

```typescript
interface CreateUserActionState {
  success: boolean;
  message: string;
  user?: BasicUserWithLastLogin | null;
  error?: string;
}
```

### Example Form Component

```tsx
import { useActionState } from "react";
import { createUserAction, CreateUserActionState } from "@/app/api/admin/actions";

export function CreateUserForm() {
  const [_, createUserFormAction] = useActionState<CreateUserActionState, FormData>(
    async (_prevState, formData) => {
      return await createUserAction({}, formData);
    },
    {},
  );

  return (
    <form action={createUserFormAction}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="name" type="text" placeholder="Name" required />
      <input name="password" type="password" placeholder="Password" required minLength={8} />
      <select name="role">
        <option value="user">User</option>
        <option value="editor">Editor</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit">Create User</button>
    </form>
  );
}
```

## Security Features

1. **Admin Permission Required**: Only users with admin role can create new users
2. **Email Uniqueness Check**: Prevents duplicate email addresses
3. **Password Validation**: Enforces minimum password requirements
4. **Role Validation**: Ensures only valid roles are assigned
5. **Session Management**: Automatically handles user sessions

## Error Handling

The server action handles various error scenarios:

- **User Already Exists**: Returns error if email is already registered
- **Invalid Input**: Validates email format, name length, and password strength
- **Permission Denied**: Requires admin role to execute
- **System Errors**: Logs errors and returns user-friendly messages

## Integration with Better Auth

The server action integrates with Better Auth's:

- `signUpEmail`: Creates the user account
- `setRole`: Assigns the specified role
- Database hooks: Automatically handles user creation and role assignment

## Translations

All user-facing messages are internationalized using the `Admin.UserCreate` namespace:

- `userAlreadyExists`: "User with this email already exists"
- `userCreatedSuccessfully`: "User {name} created successfully with {role} role"
- `failedToCreateUser`: "Failed to create user"
- `unknownError`: "Unknown error occurred"

