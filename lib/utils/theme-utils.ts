/*
<ai_context>
Theme utilities for consistent dark mode handling
</ai_context>
*/

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names with proper dark mode support
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Theme-aware color classes
 */
export const themeColors = {
  // Background colors
  background: {
    primary: "bg-white dark:bg-gray-900",
    secondary: "bg-gray-50 dark:bg-gray-800",
    tertiary: "bg-gray-100 dark:bg-gray-700",
    card: "bg-white dark:bg-gray-800",
    hover: "hover:bg-gray-50 dark:hover:bg-gray-700",
    muted: "bg-gray-100 dark:bg-gray-800"
  },

  // Text colors
  text: {
    primary: "text-gray-900 dark:text-gray-100",
    secondary: "text-gray-600 dark:text-gray-400",
    muted: "text-gray-500 dark:text-gray-500",
    accent: "text-blue-600 dark:text-blue-400",
    danger: "text-red-600 dark:text-red-400",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400"
  },

  // Border colors
  border: {
    primary: "border-gray-200 dark:border-gray-700",
    secondary: "border-gray-300 dark:border-gray-600",
    focus: "focus:border-blue-500 dark:focus:border-blue-400"
  },

  // Status colors with proper dark mode variants
  status: {
    success: {
      bg: "bg-green-100 dark:bg-green-900/20",
      text: "text-green-800 dark:text-green-300",
      border: "border-green-200 dark:border-green-800"
    },
    error: {
      bg: "bg-red-100 dark:bg-red-900/20",
      text: "text-red-800 dark:text-red-300",
      border: "border-red-200 dark:border-red-800"
    },
    warning: {
      bg: "bg-yellow-100 dark:bg-yellow-900/20",
      text: "text-yellow-800 dark:text-yellow-300",
      border: "border-yellow-200 dark:border-yellow-800"
    },
    info: {
      bg: "bg-blue-100 dark:bg-blue-900/20",
      text: "text-blue-800 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800"
    }
  },

  // Component-specific colors
  button: {
    primary:
      "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
    secondary:
      "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
    ghost: "hover:bg-gray-100 dark:hover:bg-gray-800"
  },

  // Input colors
  input: {
    bg: "bg-white dark:bg-gray-800",
    border: "border-gray-300 dark:border-gray-600",
    focus: "focus:border-blue-500 dark:focus:border-blue-400",
    placeholder: "placeholder:text-gray-400 dark:placeholder:text-gray-500"
  }
}

/**
 * Get theme-aware classes for common patterns
 */
export function getThemeClasses(variant: keyof typeof themePatterns) {
  return themePatterns[variant]
}

const themePatterns = {
  card: cn(
    themeColors.background.card,
    themeColors.border.primary,
    "rounded-lg border shadow-sm"
  ),

  input: cn(
    themeColors.input.bg,
    themeColors.input.border,
    themeColors.input.focus,
    themeColors.input.placeholder,
    "rounded-md px-3 py-2 transition-colors"
  ),

  button: {
    primary: cn(
      themeColors.button.primary,
      "rounded-md px-4 py-2 font-medium text-white transition-colors"
    ),
    secondary: cn(
      themeColors.button.secondary,
      themeColors.text.primary,
      "rounded-md px-4 py-2 font-medium transition-colors"
    ),
    ghost: cn(
      themeColors.button.ghost,
      themeColors.text.primary,
      "rounded-md px-4 py-2 font-medium transition-colors"
    )
  },

  badge: {
    default: cn(
      themeColors.background.secondary,
      themeColors.text.primary,
      "rounded-full px-2 py-1 text-xs font-medium"
    ),
    success: cn(
      themeColors.status.success.bg,
      themeColors.status.success.text,
      "rounded-full px-2 py-1 text-xs font-medium"
    ),
    error: cn(
      themeColors.status.error.bg,
      themeColors.status.error.text,
      "rounded-full px-2 py-1 text-xs font-medium"
    ),
    warning: cn(
      themeColors.status.warning.bg,
      themeColors.status.warning.text,
      "rounded-full px-2 py-1 text-xs font-medium"
    )
  }
}
