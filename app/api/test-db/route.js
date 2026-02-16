// app/api/test-db/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
    console.log('DB Name:', process.env.DB_NAME);
    
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'crm_db');
    
    // Test the connection by listing collections
    const collections = await db.listCollections().toArray();
    
    console.log('Connected successfully!');
    console.log('Collections found:', collections.map(c => c.name));
    
    // Try to count users
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      database: db.databaseName,
      collections: collections.map(c => c.name),
      userCount: userCount
    });
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}