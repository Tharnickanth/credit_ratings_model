// app/api/permissions/[id]/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// PUT - Update a permission
export async function PUT(request, { params }) {
  try {
    console.log('=== API PUT Request Started (Update Permission) ===');
    
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    const body = await request.json();
    console.log('Permission ID:', id);
    console.log('Update data:', body);
    
    const { permissionId, label, category, position, status } = body;

    // Validate required fields
    if (!permissionId || !label || !category) {
      console.log('Validation failed: Missing fields');
      return NextResponse.json(
        { error: 'Permission ID, label, and category are required' },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid permission ID' },
        { status: 400 }
      );
    }

    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('crm_db');
    const permissionsCollection = db.collection('permissions');
    console.log('Connected to MongoDB successfully');

    // Update permission
    const updateData = {
      permissionId,
      label,
      category,
      position: position || 0,
      status: status || 'active',
      updatedAt: new Date()
    };

    console.log('Updating permission...');
    const result = await permissionsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      console.log('Permission not found');
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    console.log('Permission updated successfully');
    return NextResponse.json(
      { 
        message: 'Permission updated successfully',
        permission: { id, ...updateData }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('=== Error Updating Permission ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a permission
export async function DELETE(request, { params }) {
  try {
    console.log('=== API DELETE Request Started (Delete Permission) ===');
    
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    console.log('Permission ID to delete:', id);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid permission ID' },
        { status: 400 }
      );
    }

    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('crm_db');
    const permissionsCollection = db.collection('permissions');
    const rolesCollection = db.collection('roles');
    console.log('Connected to MongoDB successfully');

    // Get the permission to find its permissionId
    const permission = await permissionsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    // Check if permission is used in any roles
    const rolesUsingPermission = await rolesCollection.countDocuments({
      permissions: permission.permissionId
    });

    if (rolesUsingPermission > 0) {
      console.log(`Permission is used in ${rolesUsingPermission} roles`);
      return NextResponse.json(
        { error: `Cannot delete permission. It is used in ${rolesUsingPermission} role(s)` },
        { status: 400 }
      );
    }

    // Delete permission
    console.log('Deleting permission...');
    const result = await permissionsCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      console.log('Permission not found');
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    console.log('Permission deleted successfully');
    return NextResponse.json(
      { message: 'Permission deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('=== Error Deleting Permission ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// GET - Fetch a single permission
export async function GET(request, { params }) {
  try {
    console.log('=== API GET Request Started (Fetch Single Permission) ===');
    
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    console.log('Permission ID:', id);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid permission ID' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const permissionsCollection = db.collection('permissions');

    const permission = await permissionsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!permission) {
      console.log('Permission not found');
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    // Convert _id to string
    const permissionResponse = {
      ...permission,
      _id: permission._id.toString()
    };

    console.log('Permission found:', permission.permissionId);
    return NextResponse.json({ permission: permissionResponse }, { status: 200 });

  } catch (error) {
    console.error('=== Error Fetching Permission ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}