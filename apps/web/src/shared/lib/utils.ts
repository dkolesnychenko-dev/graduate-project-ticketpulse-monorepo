import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * shadcn/ui's standard `cn` helper. Merges Tailwind classes intelligently
 * so conditional class application doesn't produce duplicate/conflicting
 * utilities (`bg-red-500 bg-blue-500` ⇒ `bg-blue-500`).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
