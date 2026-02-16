// app/api/permissions/landing-actions/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    console.log('========================================');
    console.log('API: POST /api/permissions/landing-actions called');
    
    const client = await clientPromise;
    const db = client.db('crm_db');
    
    const body = await request.json();
    const { permissionIds } = body;
    
    console.log('API: Received', permissionIds?.length, 'permission IDs');

    if (!permissionIds || permissionIds.length === 0) {
      return NextResponse.json([]);
    }

    // Convert string IDs to ObjectIds
    const objectIds = permissionIds.map(id => new ObjectId(id));

    // Fetch permissions that should show in landing page
    // status can be either 'active' (string) or true (boolean)
    const permissions = await db.collection('permissions').find({
      _id: { $in: objectIds },
      type: 'permission',
      $or: [
        { status: 'active' },
        { status: true }
      ],
      showInLanding: true  // New field to control visibility
    })
    .sort({ landingPosition: 1 })  // New field for ordering
    .toArray();

    console.log('API: Found', permissions.length, 'landing page actions');
    console.log('========================================');
    
    return NextResponse.json(permissions);

  } catch (error) {
    console.error('API: Error fetching landing actions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch landing actions', details: error.message },
      { status: 500 }
    );
  }
}