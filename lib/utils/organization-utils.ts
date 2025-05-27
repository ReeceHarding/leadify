/*
<ai_context>
Utility functions for consistent organization ID handling
</ai_context>
*/

import { loggers } from "@/lib/logger"

const logger = loggers.org

export class OrganizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "OrganizationError"
  }
}

/**
 * Validates that an organization ID exists and is not empty
 * @throws {OrganizationError} if organizationId is invalid
 */
export function validateOrganizationId(
  organizationId: string | undefined | null,
  context: string = "Operation"
): string {
  if (!organizationId || organizationId.trim() === "") {
    const error = `${context} requires a valid organization ID`
    logger.error(error)
    throw new OrganizationError(error)
  }
  return organizationId
}

/**
 * Gets organization ID with proper fallback chain
 * @returns organizationId or throws if none found
 */
export function resolveOrganizationId(options: {
  organizationId?: string | null
  warmupAccountOrgId?: string | null
  activeOrganizationId?: string | null
  context?: string
}): string {
  const {
    organizationId,
    warmupAccountOrgId,
    activeOrganizationId,
    context = "Operation"
  } = options

  // Try each source in order
  const resolved = organizationId || warmupAccountOrgId || activeOrganizationId

  return validateOrganizationId(resolved, context)
}

/**
 * Safely gets organization ID, returns null if not found
 */
export function getOrganizationIdSafe(options: {
  organizationId?: string | null
  warmupAccountOrgId?: string | null
  activeOrganizationId?: string | null
}): string | null {
  try {
    return resolveOrganizationId(options)
  } catch {
    return null
  }
}

/**
 * Type guard to check if an object has a valid organizationId
 */
export function hasOrganizationId<T extends { organizationId?: any }>(
  obj: T
): obj is T & { organizationId: string } {
  return (
    typeof obj.organizationId === "string" && obj.organizationId.trim() !== ""
  )
}
