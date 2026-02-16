// app/api/roles/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';

// POST - Create a new role
export async function POST(request) {
  try {
    console.log('=== API POST Request Started (Create Role) ===');
    
    const body = await request.json();
    console.log('Received data:', body);
    
    const { roleName, description, permissions, status } = body;

    // Validate required fields
    if (!roleName || !permissions || permissions.length === 0) {
      console.log('Validation failed: Missing fields');
      return NextResponse.json(
        { error: 'Role name and at least one permission are required' },
        { status: 400 }
      );
    }

    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('crm_db');
    const rolesCollection = db.collection('roles');
    console.log('Connected to MongoDB successfully');

    // Check if role already exists
    console.log('Checking for existing role...');
    const existingRole = await rolesCollection.findOne({
      roleName: { $regex: new RegExp(`^${roleName}$`, 'i') }
    });

    if (existingRole) {
      console.log('Role already exists');
      return NextResponse.json(
        { error: 'Role with this name already exists' },
        { status: 409 }
      );
    }

    // Create role object
    const newRole = {
      roleName,
      description: description || '',
      permissions,
      status: status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert role into database
    console.log('Inserting role into database...');
    const result = await rolesCollection.insertOne(newRole);
    console.log('Role inserted successfully. ID:', result.insertedId);

    // Return success response
    const roleResponse = {
      id: result.insertedId,
      roleName,
      description,
      permissions,
      status,
      createdAt: newRole.createdAt
    };

    console.log('=== Role Created Successfully ===');
    return NextResponse.json(
      { 
        message: 'Role created successfully', 
        role: roleResponse 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('=== Error Creating Role ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// GET - Fetch all roles
export async function GET(request) {
  try {
    console.log('=== API GET Request Started (Fetch Roles) ===');
    
    const client = await clientPromise;
    const db = client.db('crm_db');
    const rolesCollection = db.collection('roles');

    // Fetch all roles and convert _id to string
    const rolesData = await rolesCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Convert ObjectId to string for each role
    const roles = rolesData.map(role => ({
      ...role,
      _id: role._id.toString()
    }));

    console.log(`Found ${roles.length} roles`);
    return NextResponse.json({ roles }, { status: 200 });

  } catch (error) {
    console.error('=== Error Fetching Roles ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}