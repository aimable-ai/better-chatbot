"use client";

import type * as React from "react";
import { cn } from "lib/utils";
import { generateInitials, generateAvatarColor } from "lib/utils/initials";

interface InitialsAvatarProps {
  name?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  maxInitials?: number;
}

const sizeClasses = {
  sm: "size-6 text-xs",
  md: "size-8 text-sm",
  lg: "size-10 text-base",
  xl: "size-12 text-lg",
};

export function InitialsAvatar({
  name,
  className,
  size = "md",
  maxInitials = 2,
}: InitialsAvatarProps) {
  const initials = generateInitials(name, maxInitials);
  const backgroundColor = generateAvatarColor(initials);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-medium text-white",
        sizeClasses[size],
        className,
      )}
      style={{ backgroundColor }}
      title={name || "User"}
    >
      {initials}
    </div>
  );
}
