import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    console.log('========================================');
    console.log('API: POST /api/permissions/user-permissions called');
    
    const client = await clientPromise;
    const db = client.db('crm_db');
    
    const body = await request.json();
    const { permissionIds } = body;
    
    console.log('API: Received', permissionIds?.length, 'permission IDs');
    console.log('API: First few IDs:', permissionIds?.slice(0, 3));

    if (!permissionIds || permissionIds.length === 0) {
      return NextResponse.json([]);
    }

    // Convert string IDs to ObjectIds
    const objectIds = permissionIds.map(id => new ObjectId(id));
    console.log('API: Converted to ObjectIds');

    // Check total permissions in collection
    const totalCount = await db.collection('permissions').countDocuments();
    console.log('API: Total documents in permissions collection:', totalCount);

    // Check how many match our query
    const matchCount = await db.collection('permissions').countDocuments({
      _id: { $in: objectIds }
    });
    console.log('API: Documents matching IDs:', matchCount);

    // Fetch permissions
    const permissions = await db.collection('permissions').find({
      _id: { $in: objectIds },
      type: 'permission',
      status: 'active'
    }).toArray();

    console.log('API: Found', permissions.length, 'active permissions with type="permission"');
    
    if (permissions.length === 0) {
      // Debug: Get one sample document
      const sample = await db.collection('permissions').findOne({ _id: objectIds[0] });
      console.log('API: Sample document:', sample);
    }
    
    console.log('========================================');
    
    return NextResponse.json(permissions);

  } catch (error) {
    console.error('API: Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions', details: error.message },
      { status: 500 }
    );
  }
}