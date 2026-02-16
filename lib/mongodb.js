// lib/mongodb.js
import { MongoClient } from 'mongodb';

// Do NOT read env or connect at module top level.
// Only do it when the function is called (runtime), not at build-time.
export function getMongoClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // Throw only when someone actually calls this (runtime)
    throw new Error('MONGODB_URI is not set');
  }

  // cache client across dev hot-reloads & serverless invocations
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

// If you previously used a default import, you can also:
// export default getMongoClientPromise;