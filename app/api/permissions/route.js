import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';

// POST - Create new category or permission
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, name, description, position, icon, category, subCategory, label, subPosition, pagename, status } = body;

    const client = await clientPromise;
    const db = client.db('crm_db');
    const permissionsCollection = db.collection('permissions');

    // Handle Category Creation
    if (type === 'category') {
      if (!name) {
        return NextResponse.json(
          { error: 'Category name is required' },
          { status: 400 }
        );
      }

      if (!position) {
        return NextResponse.json(
          { error: 'Position is required' },
          { status: 400 }
        );
      }

      if (!icon) {
        return NextResponse.json(
          { error: 'Icon is required' },
          { status: 400 }
        );
      }

      // Check for duplicate category name
      const existing = await permissionsCollection.findOne({
        type: 'category',
        name
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Category with this name already exists' },
          { status: 409 }
        );
      }

      const newCategory = {
        type: 'category',
        name,
        description: description || '',
        position: parseInt(position),
        icon,
        status: status || 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await permissionsCollection.insertOne(newCategory);

      return NextResponse.json(
        { message: 'Category created successfully', category: { ...newCategory, _id: result.insertedId } },
        { status: 201 }
      );
    }

    // Handle Permission (Subcategory) Creation
    if (!category || !subCategory || !position || !subPosition || !icon || !pagename) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check for duplicates by category and subcategory combination
    const existing = await permissionsCollection.findOne({
      type: 'permission',
      category,
      subCategory,
      subPosition
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Permission with this combination already exists' },
        { status: 409 }
      );
    }

    const newPermission = {
      type: 'permission',
      category,
      subCategory,
      label: label || subCategory,
      position: parseInt(position), // This comes from the category's position
      subPosition: parseInt(subPosition),
      icon,
      pagename,
      status: status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await permissionsCollection.insertOne(newPermission);

    return NextResponse.json(
      { message: 'Permission created successfully', permission: { ...newPermission, _id: result.insertedId } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// GET - Fetch all records (categories or permissions based on query)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'category' or 'permission'

    const client = await clientPromise;
    const db = client.db('crm_db');
    const permissionsCollection = db.collection('permissions');

    // Fetch categories
    if (type === 'category') {
      const categories = await permissionsCollection
        .find({ type: 'category' })
        .sort({ position: 1, name: 1 })
        .toArray();

      return NextResponse.json({ categories }, { status: 200 });
    }

    // Fetch permissions (subcategories)
    // Sort by position (category's position) first, then by subPosition
    const permissions = await permissionsCollection
      .find({ type: 'permission' })
      .sort({ position: 1, subPosition: 1 })
      .toArray();

    return NextResponse.json({ permissions }, { status: 200 });
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}