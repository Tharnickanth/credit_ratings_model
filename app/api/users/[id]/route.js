// app/api/users/[id]/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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

    // Fetch user with role and privilege details
    const users = await usersCollection
      .aggregate([
        {
          $match: { _id: new ObjectId(id) }
        },
        {
          $lookup: {
            from: 'roles',
            localField: 'role',
            foreignField: '_id',
            as: 'roleDetails'
          }
        },
        {
          $lookup: {
            from: 'userprivilege',
            localField: '_id',
            foreignField: 'userId',
            as: 'privilegeDetails'
          }
        },
        {
          $unwind: {
            path: '$roleDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$privilegeDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            password: 0
          }
        }
      ])
      .toArray();

    if (!users || users.length === 0) {
      console.log('User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User found:', users[0].username);
    return NextResponse.json({ user: users[0] }, { status: 200 });

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
    
    // Parse FormData instead of JSON
    const formData = await request.formData();
    
    console.log('User ID:', id);
    
    // Extract fields from FormData
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const email = formData.get('email');
    const username = formData.get('username');
    const status = formData.get('status');
    const role = formData.get('role');
    const password = formData.get('password');
    const currentPassword = formData.get('currentPassword');
    const profilePicture = formData.get('profilePicture'); // File object

    console.log('Update data received');

    // Validate required fields
    if (!firstName || !lastName || !email || !username || !role) {
      console.log('Validation failed: Missing fields');
      return NextResponse.json(
        { error: 'First name, last name, email, username, and role are required' },
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
    const rolesCollection = db.collection('roles');
    const userPrivilegeCollection = db.collection('userprivilege');
    console.log('Connected to MongoDB successfully');

    // Validate if role exists in roles collection and get role details
    console.log('Validating role and fetching permissions...');
    const roleData = await rolesCollection.findOne({ _id: new ObjectId(role) });
    if (!roleData) {
      console.log('Invalid role:', role);
      return NextResponse.json(
        { error: 'Invalid role selected' },
        { status: 400 }
      );
    }

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

    // Get current user to check if role changed and verify password
    const currentUser = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!currentUser) {
      console.log('User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password if changing password
    if (password && currentPassword) {
      console.log('Verifying current password...');
      const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isPasswordValid) {
        console.log('Invalid current password');
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }
    }

    const roleChanged = currentUser.role.toString() !== role;

    // Prepare update data
    const updateData = {
      firstName,
      lastName,
      email,
      username,
      status: status || 'active',
      role: new ObjectId(role),
      updatedAt: new Date()
    };

    // Hash password if provided
    if (password) {
      console.log('Hashing new password...');
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Handle profile picture upload
    if (profilePicture && profilePicture.size > 0) {
      console.log('Processing profile picture upload...');
      
      try {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(profilePicture.type)) {
          return NextResponse.json(
            { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed' },
            { status: 400 }
          );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (profilePicture.size > maxSize) {
          return NextResponse.json(
            { error: 'File size too large. Maximum size is 5MB' },
            { status: 400 }
          );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
        try {
          await mkdir(uploadsDir, { recursive: true });
        } catch (err) {
          console.log('Directory already exists or error creating:', err.message);
        }

        // Generate unique filename
        const fileExtension = profilePicture.name.split('.').pop();
        const fileName = `${id}_${Date.now()}.${fileExtension}`;
        const filePath = path.join(uploadsDir, fileName);

        // Convert file to buffer and save
        const bytes = await profilePicture.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Store relative path in database
        updateData.profilePicture = `/uploads/profiles/${fileName}`;
        console.log('Profile picture saved:', updateData.profilePicture);

      } catch (uploadError) {
        console.error('Error uploading profile picture:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload profile picture: ' + uploadError.message },
          { status: 500 }
        );
      }
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

    // Update user privilege if role changed
    if (roleChanged) {
      console.log('Role changed, updating user privilege...');
      const privilegeUpdateData = {
        roleId: new ObjectId(role),
        roleName: roleData.roleName,
        permissions: roleData.permissions || [],
        updatedAt: new Date()
      };

      const privilegeResult = await userPrivilegeCollection.updateOne(
        { userId: new ObjectId(id) },
        { $set: privilegeUpdateData },
        { upsert: true }
      );

      console.log('User privilege updated successfully');
    }

    console.log('User updated successfully');
    
    // Return updated user (without password) with role and privilege details
    const updatedUsers = await usersCollection
      .aggregate([
        {
          $match: { _id: new ObjectId(id) }
        },
        {
          $lookup: {
            from: 'roles',
            localField: 'role',
            foreignField: '_id',
            as: 'roleDetails'
          }
        },
        {
          $lookup: {
            from: 'userprivilege',
            localField: '_id',
            foreignField: 'userId',
            as: 'privilegeDetails'
          }
        },
        {
          $unwind: {
            path: '$roleDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$privilegeDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            password: 0
          }
        }
      ])
      .toArray();

    return NextResponse.json(
      { 
        message: 'User updated successfully',
        user: updatedUsers[0]
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
    const userPrivilegeCollection = db.collection('userprivilege');
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

    // Delete associated user privilege
    console.log('Deleting user privilege...');
    await userPrivilegeCollection.deleteOne({
      userId: new ObjectId(id)
    });

    console.log('User and privilege deleted successfully');
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