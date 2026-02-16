// app/api/user-privileges/[userId]/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request, context) {
  try {
    const client = await clientPromise;
    const db = client.db('crm_db');
    
    // Await params in Next.js 15+
    const params = await context.params;
    const { userId } = params;

    console.log('========================================');
    console.log('API: Fetching privileges for userId:', userId);

    // IMPORTANT: Change collection name from 'userprivileges' to 'userprivilege' (singular)
    const collection = db.collection('userprivilege');
    
    // Check total count
    const totalCount = await collection.countDocuments();
    console.log('API: Total records in userprivilege collection:', totalCount);

    // Try to find user privilege - check both ObjectId and string formats
    let userPrivilege = await collection.findOne({
      userId: new ObjectId(userId)
    });

    if (!userPrivilege) {
      console.log('API: Not found with ObjectId, trying string match...');
      userPrivilege = await collection.findOne({
        userId: userId
      });
    }

    console.log('API: User privilege found:', userPrivilege ? 'YES' : 'NO');
    if (userPrivilege) {
      console.log('API: Permissions count:', userPrivilege.permissions?.length);
    }
    console.log('========================================');

    if (!userPrivilege) {
      return NextResponse.json({ 
        permissions: [],
        message: 'No privileges found for this user'
      }, { status: 404 });
    }

    return NextResponse.json(userPrivilege);

  } catch (error) {
    console.error('API: Error fetching user privileges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user privileges', details: error.message },
      { status: 500 }
    );
  }
}