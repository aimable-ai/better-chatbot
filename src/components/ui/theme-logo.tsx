"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeLogoProps {
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
}

export function ThemeLogo({
  alt = "Aimable",
  className = "",
  width,
  height,
}: ThemeLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same dimensions during SSR
    return (
      <img
        src="/logo.webp"
        alt={alt}
        className={className}
        width={width}
        height={height}
        style={{ opacity: 0 }}
      />
    );
  }

  // Use resolvedTheme to get the actual theme (handles system theme)
  const isDark = resolvedTheme === "dark";
  const logoSrc = isDark ? "/logo-dark.png" : "/logo.webp";

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
    />
  );
}
