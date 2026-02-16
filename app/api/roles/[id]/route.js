// app/api/roles/[id]/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

// PUT - Update a role
export async function PUT(request, { params }) {
  try {
    console.log('=== API PUT Request Started (Update Role) ===');
    
    // Await params in Next.js 15+
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    const body = await request.json();
    console.log('Role ID:', id);
    console.log('Role ID type:', typeof id);
    console.log('Role ID length:', id?.length);
    console.log('Update data:', body);
    
    const { roleName, description, permissions, status } = body;

    // Validate required fields
    if (!roleName || !permissions || permissions.length === 0) {
      console.log('Validation failed: Missing fields');
      return NextResponse.json(
        { error: 'Role name and at least one permission are required' },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid role ID' },
        { status: 400 }
      );
    }

    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('crm_db');
    const rolesCollection = db.collection('roles');
    console.log('Connected to MongoDB successfully');

    // Check if another role with the same name exists (excluding current role)
    console.log('Checking for duplicate role name...');
    const existingRole = await rolesCollection.findOne({
      roleName: { $regex: new RegExp(`^${roleName}$`, 'i') },
      _id: { $ne: new ObjectId(id) }
    });

    if (existingRole) {
      console.log('Another role with this name already exists');
      return NextResponse.json(
        { error: 'Another role with this name already exists' },
        { status: 409 }
      );
    }

    // Update role
    const updateData = {
      roleName,
      description: description || '',
      permissions,
      status: status || 'active',
      updatedAt: new Date()
    };

    console.log('Updating role...');
    const result = await rolesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      console.log('Role not found');
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    console.log('Role updated successfully');
    return NextResponse.json(
      { 
        message: 'Role updated successfully',
        role: { id, ...updateData }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('=== Error Updating Role ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a role
export async function DELETE(request, { params }) {
  try {
    console.log('=== API DELETE Request Started (Delete Role) ===');
    
    // Await params in Next.js 15+
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    console.log('Role ID to delete:', id);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid role ID' },
        { status: 400 }
      );
    }

    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('crm_db');
    const rolesCollection = db.collection('roles');
    console.log('Connected to MongoDB successfully');

    // Check if role is assigned to any users (optional check)
    const usersCollection = db.collection('users');
    const usersWithRole = await usersCollection.countDocuments({
      roleId: new ObjectId(id)
    });

    if (usersWithRole > 0) {
      console.log(`Role is assigned to ${usersWithRole} users`);
      return NextResponse.json(
        { error: `Cannot delete role. It is assigned to ${usersWithRole} user(s)` },
        { status: 400 }
      );
    }

    // Delete role
    console.log('Deleting role...');
    const result = await rolesCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      console.log('Role not found');
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    console.log('Role deleted successfully');
    return NextResponse.json(
      { message: 'Role deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('=== Error Deleting Role ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// GET - Fetch a single role
export async function GET(request, { params }) {
  try {
    console.log('=== API GET Request Started (Fetch Single Role) ===');
    
    // Await params in Next.js 15+
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    console.log('Role ID:', id);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid role ID' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const rolesCollection = db.collection('roles');

    const role = await rolesCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!role) {
      console.log('Role not found');
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    console.log('Role found:', role.roleName);
    return NextResponse.json({ role }, { status: 200 });

  } catch (error) {
    console.error('=== Error Fetching Role ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}