/**
 * Lightweight class name concatenation utility without requiring external clsx/tailwind-merge
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
