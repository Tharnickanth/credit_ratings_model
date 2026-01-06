// app/api/users/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    console.log('=== API POST Request Started ===');
    
    const body = await request.json();
    console.log('Received data:', body);
    
    const { firstName, lastName, email, username, password, status } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !username || !password) {
      console.log('Validation failed: Missing fields');
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    console.log('Connecting to MongoDB...');
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('crm_db');
    const usersCollection = db.collection('users');
    console.log('Connected to MongoDB successfully');

    // Check if user already exists
    console.log('Checking for existing user...');
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      console.log('User already exists');
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Create user object
    const newUser = {
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert user into database
    console.log('Inserting user into database...');
    const result = await usersCollection.insertOne(newUser);
    console.log('User inserted successfully. ID:', result.insertedId);

    // Return success response (without password)
    const userResponse = {
      id: result.insertedId,
      firstName,
      lastName,
      email,
      username,
      status,
      createdAt: newUser.createdAt
    };

    console.log('=== User Created Successfully ===');
    return NextResponse.json(
      { 
        message: 'User created successfully', 
        user: userResponse 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('=== Error Creating User ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch all users
export async function GET(request) {
  try {
    console.log('=== API GET Request Started ===');
    
    const client = await clientPromise;
    const db = client.db('crm_db');
    const usersCollection = db.collection('users');

    // Fetch all users (excluding passwords)
    const users = await usersCollection
      .find({})
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Found ${users.length} users`);
    return NextResponse.json({ users }, { status: 200 });

  } catch (error) {
    console.error('=== Error Fetching Users ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}