// app/api/userprivilege/[id]/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

// PUT - Update user privileges (custom permissions)
export async function PUT(request, { params }) {
  try {
    console.log('=== API PUT Request Started (Update User Privilege) ===');
    
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams; // This is the userId
    
    const body = await request.json();
    console.log('User ID:', id);
    console.log('Update data:', body);
    
    const { permissions } = body;

    // Validate required fields
    if (!permissions || !Array.isArray(permissions)) {
      console.log('Validation failed: Permissions must be an array');
      return NextResponse.json(
        { error: 'Permissions must be provided as an array' },
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
    const userPrivilegeCollection = db.collection('userprivilege');
    const usersCollection = db.collection('users');
    console.log('Connected to MongoDB successfully');

    // Check if user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) {
      console.log('User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user privilege with custom permissions
    const updateData = {
      permissions,
      updatedAt: new Date()
    };

    console.log('Updating user privilege...');
    const result = await userPrivilegeCollection.updateOne(
      { userId: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      console.log('User privilege not found');
      return NextResponse.json(
        { error: 'User privilege not found. Please ensure the user has a role assigned.' },
        { status: 404 }
      );
    }

    console.log('User privilege updated successfully');

    // Return updated privilege
    const updatedPrivilege = await userPrivilegeCollection.findOne({
      userId: new ObjectId(id)
    });

    return NextResponse.json(
      { 
        message: 'User privileges updated successfully',
        privilege: updatedPrivilege
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('=== Error Updating User Privilege ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// GET - Fetch user privilege
export async function GET(request, { params }) {
  try {
    console.log('=== API GET Request Started (Fetch User Privilege) ===');
    
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams; // This is the userId
    
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
    const userPrivilegeCollection = db.collection('userprivilege');

    const privilege = await userPrivilegeCollection.findOne({
      userId: new ObjectId(id)
    });

    if (!privilege) {
      console.log('User privilege not found');
      return NextResponse.json(
        { error: 'User privilege not found' },
        { status: 404 }
      );
    }

    console.log('User privilege found');
    return NextResponse.json({ privilege }, { status: 200 });

  } catch (error) {
    console.error('=== Error Fetching User Privilege ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}