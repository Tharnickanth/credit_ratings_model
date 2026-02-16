// app/api/permissions/menu-categories/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('crm_db'); // Replace with your DB name

    // Fetch all categories
    const categories = await db.collection('permissions').find({
      type: 'category',
      status: 'active'
    }).sort({ position: 1 }).toArray();

    return NextResponse.json(categories);

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}