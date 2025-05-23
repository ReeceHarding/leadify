"use client"

import { useState } from "react"
import { db, storage } from "@/db/db"
import { collection, addDoc, getDocs } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

export default function FirebaseTestPage() {
  const [status, setStatus] = useState("")
  const [documents, setDocuments] = useState<any[]>([])

  const testFirestore = async () => {
    try {
      setStatus("Testing Firestore...")

      // Add a test document
      const docRef = await addDoc(collection(db, "test"), {
        message: "Hello from Next.js!",
        timestamp: new Date(),
        type: "nextjs-test"
      })

      setStatus(`✅ Document added with ID: ${docRef.id}`)

      // Read documents
      const querySnapshot = await getDocs(collection(db, "test"))
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setDocuments(docs)
      setStatus(`✅ Found ${docs.length} documents`)
    } catch (error) {
      setStatus(`❌ Firestore error: ${error}`)
    }
  }

  const testStorage = async () => {
    try {
      setStatus("Testing Storage...")

      // Create a test file
      const testContent = "Hello Firebase Storage from Next.js!"
      const testFile = new Blob([testContent], { type: "text/plain" })

      const storageRef = ref(storage, `test/nextjs-${Date.now()}.txt`)
      const uploadResult = await uploadBytes(storageRef, testFile)

      const downloadURL = await getDownloadURL(uploadResult.ref)

      setStatus(`✅ File uploaded: ${downloadURL}`)
    } catch (error) {
      setStatus(`❌ Storage error: ${error}`)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-8 text-3xl font-bold">Firebase Test Page</h1>

      <div className="space-y-4">
        <button
          onClick={testFirestore}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Test Firestore
        </button>

        <button
          onClick={testStorage}
          className="ml-4 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
        >
          Test Storage
        </button>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Status:</h2>
        <p className="rounded bg-gray-100 p-4 text-sm">{status}</p>
      </div>

      {documents.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Documents:</h2>
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="rounded bg-gray-50 p-3">
                <p>
                  <strong>ID:</strong> {doc.id}
                </p>
                <p>
                  <strong>Message:</strong> {doc.message}
                </p>
                <p>
                  <strong>Type:</strong> {doc.type}
                </p>
                <p>
                  <strong>Timestamp:</strong>{" "}
                  {doc.timestamp?.toDate?.()?.toString() || doc.timestamp}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
