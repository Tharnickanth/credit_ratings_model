// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    console.log('=== Login Request Started ===');
    
    const body = await request.json();
    const { username, password } = body;

    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    console.log('Connecting to MongoDB...');
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('crm_db');
    const usersCollection = db.collection('users');

    // Find user by username or email
    console.log('Looking for user:', username);
    const user = await usersCollection.findOne({
      $or: [
        { username: username },
        { email: username }
      ]
    });

    if (!user) {
      console.log('User not found');
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (user.status !== 'active') {
      console.log('User account is not active');
      return NextResponse.json(
        { error: 'Your account is inactive. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    console.log('Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('Invalid password');
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { 
          lastLogin: new Date() 
        } 
      }
    );

    // Create user response (without password)
    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      status: user.status
    };

    console.log('=== Login Successful ===');
    console.log('User:', userResponse.username);

    return NextResponse.json(
      { 
        message: 'Login successful',
        user: userResponse
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('=== Login Error ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}