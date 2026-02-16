// app/api/permissions/menu-categories/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('crm_db');

    // Fetch all categories - handle both status formats (string 'active' or boolean true)
    const categories = await db.collection('permissions').find({
      type: 'category',
      $or: [
        { status: 'active' },
        { status: true }
      ]
    }).sort({ position: 1 }).toArray();

    console.log('API: Found', categories.length, 'active categories');
    return NextResponse.json(categories);

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}