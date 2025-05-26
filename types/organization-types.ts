/*
<ai_context>
Contains types related to organizations, including the serialized versions for client components.
</ai_context>
*/

// Re-export the serialized types from the schema
export type {
  SerializedOrganizationDocument,
  SerializedOrganizationMemberDocument
} from "@/db/schema"
