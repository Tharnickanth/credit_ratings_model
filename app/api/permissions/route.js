// app/api/permissions/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// POST - Create a new permission
export async function POST(request) {
  try {
    console.log('=== API POST Request Started (Create Permission) ===');
    
    const body = await request.json();
    console.log('Received data:', body);
    
    const { permissionId, label, category, position, status } = body;

    // Validate required fields
    if (!permissionId || !label || !category) {
      console.log('Validation failed: Missing fields');
      return NextResponse.json(
        { error: 'Permission ID, label, and category are required' },
        { status: 400 }
      );
    }

    // Validate permissionId format
    if (!/^[a-z_]+$/.test(permissionId)) {
      return NextResponse.json(
        { error: 'Permission ID must contain only lowercase letters and underscores' },
        { status: 400 }
      );
    }

    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('crm_db');
    const permissionsCollection = db.collection('permissions');
    console.log('Connected to MongoDB successfully');

    // Check if permission already exists
    console.log('Checking for existing permission...');
    const existingPermission = await permissionsCollection.findOne({
      permissionId: permissionId
    });

    if (existingPermission) {
      console.log('Permission already exists');
      return NextResponse.json(
        { error: 'Permission with this ID already exists' },
        { status: 409 }
      );
    }

    // Create permission object
    const newPermission = {
      permissionId,
      label,
      category,
      position: position || 0,
      status: status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert permission into database
    console.log('Inserting permission into database...');
    const result = await permissionsCollection.insertOne(newPermission);
    console.log('Permission inserted successfully. ID:', result.insertedId);

    // Return success response
    const permissionResponse = {
      id: result.insertedId.toString(),
      ...newPermission
    };

    console.log('=== Permission Created Successfully ===');
    return NextResponse.json(
      { 
        message: 'Permission created successfully', 
        permission: permissionResponse 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('=== Error Creating Permission ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// GET - Fetch all permissions
export async function GET(request) {
  try {
    console.log('=== API GET Request Started (Fetch Permissions) ===');
    
    const client = await clientPromise;
    const db = client.db('crm_db');
    const permissionsCollection = db.collection('permissions');

    // Fetch all permissions and convert _id to string
    const permissionsData = await permissionsCollection
      .find({})
      .sort({ category: 1, position: 1 })
      .toArray();

    // Convert ObjectId to string for each permission
    const permissions = permissionsData.map(permission => ({
      ...permission,
      _id: permission._id.toString()
    }));

    console.log(`Found ${permissions.length} permissions`);
    return NextResponse.json({ permissions }, { status: 200 });

  } catch (error) {
    console.error('=== Error Fetching Permissions ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}