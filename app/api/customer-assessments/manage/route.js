import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';

/**
 * GET - Fetch all customer assessments for management (including hidden/deleted ones)
 */
export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db('crm_db');
    const collection = db.collection('customer_assessments');

    // Fetch ALL assessments - do NOT filter by isDeleted
    const assessments = await collection
      .find({}) // Empty filter to get ALL records
      .sort({ createdAt: -1 }) // Sort by newest first
      .toArray();

    // Transform _id to id for frontend compatibility
    const transformedAssessments = assessments.map(assessment => ({
      ...assessment,
      id: assessment._id.toString(),
      _id: assessment._id.toString()
    }));

    return NextResponse.json({
      success: true,
      assessments: transformedAssessments,
      total: transformedAssessments.length
    });

  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to fetch assessments' 
      },
      { status: 500 }
    );
  }
}