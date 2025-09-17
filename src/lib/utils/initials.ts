/**
 * Generates initials from a user's name
 * @param name - The user's full name
 * @param maxInitials - Maximum number of initials to return (default: 2)
 * @returns The initials in uppercase
 */
export function generateInitials(
  name: string | null | undefined,
  maxInitials: number = 2,
): string {
  if (!name || typeof name !== "string") {
    return "?";
  }

  // Split by spaces and filter out empty strings
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return "?";
  }

  // Take the first character of each word, up to maxInitials
  const initials = words
    .slice(0, maxInitials)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return initials;
}

/**
 * Generates a consistent background color based on initials
 * @param initials - The user's initials
 * @returns A CSS color string
 */
export function generateAvatarColor(initials: string): string {
  if (!initials) {
    return "#6b7280"; // Default gray
  }

  // Create a simple hash from the initials
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash to a positive number and use it to generate HSL values
  const hue = Math.abs(hash) % 360;
  const saturation = 65 + (Math.abs(hash) % 20); // 65-85% saturation
  const lightness = 45 + (Math.abs(hash) % 15); // 45-60% lightness

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
