// app/api/rating-assessments/hide/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

export async function PATCH(request) {
  try {
    const { id, isHidden } = await request.json();

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Template ID is required'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('rating_assessments');

    const result = await assessmentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isHidden: isHidden,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Template not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Template ${isHidden ? 'hidden' : 'unhidden'} successfully`
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating template visibility:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update template visibility'
    }, { status: 500 });
  }
}