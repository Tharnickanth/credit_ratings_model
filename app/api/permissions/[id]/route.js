import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

// PUT - Update category or permission
export async function PUT(request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = await request.json();
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const permissionsCollection = db.collection('permissions');

    // Get the existing record to determine its type
    const existingRecord = await permissionsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!existingRecord) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Handle Category Update
    if (existingRecord.type === 'category') {
      const { name, description, position, icon, status } = body;

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

      // Check if another category with the same name exists
      const duplicate = await permissionsCollection.findOne({
        type: 'category',
        name,
        _id: { $ne: new ObjectId(id) }
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'Category with this name already exists' },
          { status: 409 }
        );
      }

      const updateData = {
        name,
        description: description || '',
        position: parseInt(position),
        icon,
        status: status || 'active',
        updatedAt: new Date()
      };

      await permissionsCollection.updateOne(
        { _id: new ObjectId(id), type: 'category' },
        { $set: updateData }
      );

      return NextResponse.json(
        { message: 'Category updated successfully' },
        { status: 200 }
      );
    }

    // Handle Permission Update
    const { category, subCategory, label, position, subPosition, icon, pagename, status } = body;

    if (!icon) {
      return NextResponse.json(
        { error: 'Icon is required' },
        { status: 400 }
      );
    }

    const updateData = {
      category,
      subCategory,
      label: label || subCategory,
      position: parseInt(position),
      subPosition: parseInt(subPosition),
      icon,
      pagename,
      status: status || 'active',
      updatedAt: new Date()
    };

    const result = await permissionsCollection.updateOne(
      { _id: new ObjectId(id), type: 'permission' },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Permission updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete category or permission
export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const permissionsCollection = db.collection('permissions');

    // Get the record to determine its type
    const record = await permissionsCollection.findOne({ _id: new ObjectId(id) });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // If deleting a category, check for related permissions
    if (record.type === 'category') {
      const relatedPermissions = await permissionsCollection.findOne({
        type: 'permission',
        category: record.name
      });

      if (relatedPermissions) {
        return NextResponse.json(
          { error: 'Cannot delete category with existing subcategories. Please delete all related subcategories first.' },
          { status: 400 }
        );
      }
    }

    const result = await permissionsCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: `${record.type === 'category' ? 'Category' : 'Permission'} deleted successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}