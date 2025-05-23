const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, getDocs } = require("firebase/firestore");
const { getStorage, ref, uploadBytes, getDownloadURL } = require("firebase/storage");

const firebaseConfig = {
  apiKey: "AIzaSyADYATvkE2f1Q4CWTCvmHetkmBsIYoXmTs",
  authDomain: "austen-reddit-app.firebaseapp.com",
  projectId: "austen-reddit-app",
  storageBucket: "austen-reddit-app.firebasestorage.app",
  messagingSenderId: "73083209197",
  appId: "1:73083209197:web:7ce95332aa6ca9fc1753e4"
};

async function testFirebase() {
  try {
    console.log("🔥 Initializing Firebase...");
    const app = initializeApp(firebaseConfig);
    
    console.log("📄 Testing Firestore...");
    const db = getFirestore(app);
    
    // Test adding a document
    const testDoc = await addDoc(collection(db, "test"), {
      message: "Hello Firebase!",
      timestamp: new Date(),
      type: "connection-test"
    });
    console.log("✅ Document added with ID:", testDoc.id);
    
    // Test reading documents
    const querySnapshot = await getDocs(collection(db, "test"));
    console.log("✅ Found", querySnapshot.size, "test documents");
    
    console.log("📁 Testing Storage...");
    const storage = getStorage(app);
    
    // Test creating a simple text file
    const testContent = "Hello Firebase Storage!";
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    const storageRef = ref(storage, 'test/hello.txt');
    
    const uploadResult = await uploadBytes(storageRef, testBlob);
    console.log("✅ File uploaded:", uploadResult.ref.fullPath);
    
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log("✅ Download URL:", downloadURL);
    
    console.log("🎉 All Firebase services are working!");
    
  } catch (error) {
    console.error("❌ Firebase test failed:", error);
    process.exit(1);
  }
}

testFirebase(); 