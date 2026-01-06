// app/api/users/[id]/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

// GET - Fetch a single user
export async function GET(request, { params }) {
  try {
    console.log('=== API GET Request Started (Fetch Single User) ===');
    
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    console.log('User ID:', id);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } } // Exclude password
    );

    if (!user) {
      console.log('User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User found:', user.username);
    return NextResponse.json({ user }, { status: 200 });

  } catch (error) {
    console.error('=== Error Fetching User ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a user
export async function PUT(request, { params }) {
  try {
    console.log('=== API PUT Request Started (Update User) ===');
    
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    const body = await request.json();
    console.log('User ID:', id);
    console.log('Update data:', body);
    
    const { firstName, lastName, email, username, status, password } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !username) {
      console.log('Validation failed: Missing fields');
      return NextResponse.json(
        { error: 'First name, last name, email, and username are required' },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('crm_db');
    const usersCollection = db.collection('users');
    console.log('Connected to MongoDB successfully');

    // Check if email or username is already taken by another user
    console.log('Checking for duplicate email/username...');
    const existingUser = await usersCollection.findOne({
      _id: { $ne: new ObjectId(id) },
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      console.log('Email or username already exists');
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }

    // Prepare update data
    const updateData = {
      firstName,
      lastName,
      email,
      username,
      status: status || 'active',
      updatedAt: new Date()
    };

    // Hash password if provided
    if (password) {
      console.log('Hashing new password...');
      updateData.password = await bcrypt.hash(password, 10);
    }

    console.log('Updating user...');
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      console.log('User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User updated successfully');
    
    // Return updated user (without password)
    const updatedUser = await usersCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    return NextResponse.json(
      { 
        message: 'User updated successfully',
        user: updatedUser
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('=== Error Updating User ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a user
export async function DELETE(request, { params }) {
  try {
    console.log('=== API DELETE Request Started (Delete User) ===');
    
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    console.log('User ID to delete:', id);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('crm_db');
    const usersCollection = db.collection('users');
    console.log('Connected to MongoDB successfully');

    // Delete user
    console.log('Deleting user...');
    const result = await usersCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      console.log('User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User deleted successfully');
    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('=== Error Deleting User ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}