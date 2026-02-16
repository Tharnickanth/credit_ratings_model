// app/api/get-all-customers/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';

export async function GET() {
  try {
    console.log('=== Fetching All Customers ===');

    const client = await clientPromise;
    const db = client.db('crm_db');
    const assessmentsCollection = db.collection('customer_assessments');

    // Get all unique customers (by customerId)
    const customers = await assessmentsCollection
      .aggregate([
        {
          $match: {
            isDeleted: { $ne: true }
          }
        },
        {
          $sort: { assessmentDate: -1 }
        },
        {
          $group: {
            _id: '$customerId',
            customerName: { $first: '$customerName' },
            customerId: { $first: '$customerId' },
            nic: { $first: '$nic' },
            lastAssessmentDate: { $first: '$assessmentDate' }
          }
        },
        {
          $sort: { customerId: 1 }
        },
        {
          $project: {
            _id: 0,
            customerName: 1,
            customerId: 1,
            nic: 1,
            lastAssessmentDate: 1
          }
        }
      ])
      .toArray();

    console.log(`Found ${customers.length} unique customers`);

    return NextResponse.json({
      success: true,
      customers: customers,
      count: customers.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching all customers:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch customers'
    }, { status: 500 });
  }
}