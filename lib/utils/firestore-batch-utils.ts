/*
<ai_context>
Firestore batch operation utilities
</ai_context>
*/

import {
  WriteBatch,
  DocumentReference,
  collection,
  doc,
  writeBatch
} from "firebase/firestore"
import { db } from "@/db/db"
import { loggers } from "@/lib/logger"

const logger = loggers.db

const BATCH_SIZE = 500 // Firestore limit

export interface BatchOperation {
  type: "set" | "update" | "delete"
  ref: DocumentReference
  data?: any
}

/**
 * Execute multiple operations in batches
 */
export async function executeBatchOperations(
  operations: BatchOperation[]
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Executing ${operations.length} operations in batches`)

    // Split operations into chunks of BATCH_SIZE
    const chunks: BatchOperation[][] = []
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      chunks.push(operations.slice(i, i + BATCH_SIZE))
    }

    // Execute each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const batch = writeBatch(db)

      for (const operation of chunk) {
        switch (operation.type) {
          case "set":
            batch.set(operation.ref, operation.data)
            break
          case "update":
            batch.update(operation.ref, operation.data)
            break
          case "delete":
            batch.delete(operation.ref)
            break
        }
      }

      await batch.commit()
      logger.info(`Committed batch ${i + 1}/${chunks.length}`)
    }

    logger.info("All batch operations completed successfully")
    return { success: true }
  } catch (error) {
    logger.error("Batch operation failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

/**
 * Batch create documents
 */
export async function batchCreate<T extends Record<string, any>>(
  collectionName: string,
  documents: T[]
): Promise<{ success: boolean; ids: string[]; error?: string }> {
  try {
    const ids: string[] = []
    const operations: BatchOperation[] = []

    for (const docData of documents) {
      const docRef = doc(collection(db, collectionName))
      ids.push(docRef.id)
      operations.push({
        type: "set",
        ref: docRef,
        data: { ...docData, id: docRef.id }
      })
    }

    const result = await executeBatchOperations(operations)

    if (result.success) {
      return { success: true, ids }
    } else {
      return { success: false, ids: [], error: result.error }
    }
  } catch (error) {
    logger.error("Batch create failed:", error)
    return {
      success: false,
      ids: [],
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

/**
 * Batch update documents
 */
export async function batchUpdate(
  collectionName: string,
  updates: Array<{ id: string; data: Record<string, any> }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const operations: BatchOperation[] = updates.map(({ id, data }) => ({
      type: "update",
      ref: doc(db, collectionName, id),
      data
    }))

    return await executeBatchOperations(operations)
  } catch (error) {
    logger.error("Batch update failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

/**
 * Batch delete documents
 */
export async function batchDelete(
  collectionName: string,
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const operations: BatchOperation[] = ids.map(id => ({
      type: "delete",
      ref: doc(db, collectionName, id)
    }))

    return await executeBatchOperations(operations)
  } catch (error) {
    logger.error("Batch delete failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

/**
 * Batch operation builder for complex operations
 */
export class BatchBuilder {
  private operations: BatchOperation[] = []

  set(collectionName: string, docId: string, data: any): this {
    this.operations.push({
      type: "set",
      ref: doc(db, collectionName, docId),
      data
    })
    return this
  }

  update(collectionName: string, docId: string, data: any): this {
    this.operations.push({
      type: "update",
      ref: doc(db, collectionName, docId),
      data
    })
    return this
  }

  delete(collectionName: string, docId: string): this {
    this.operations.push({
      type: "delete",
      ref: doc(db, collectionName, docId)
    })
    return this
  }

  async commit(): Promise<{ success: boolean; error?: string }> {
    return await executeBatchOperations(this.operations)
  }
}
