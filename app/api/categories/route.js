// app/api/categories/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';
import { ObjectId } from 'mongodb';

// Helper function to log activity
async function logActivity(username, description, action = 'general') {
  try {
    const client = await clientPromise;
    const db = client.db('crm_db');
    const logsCollection = db.collection('UserActivityLog');

    const logEntry = {
      username,
      description,
      action,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      timestamp: new Date(),
      createdAt: new Date()
    };

    await logsCollection.insertOne(logEntry);
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

export async function GET(request) {
  try {
    
    const client = await clientPromise;
    const db = client.db('crm_db');
    const categoriesCollection = db.collection('categories');

    const categories = await categoriesCollection
      .find({ isDeleted: { $ne: true } })
      .sort({ name: 1 })
      .toArray();

    
    return NextResponse.json({
      success: true,
      categories: categories.map(cat => ({
        id: cat._id.toString(),
        name: cat.name,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch categories',
      categories: []
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    
    const { name, createdBy } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Category name is required'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const categoriesCollection = db.collection('categories');

    // Check if category already exists
    const existingCategory = await categoriesCollection.findOne({
      name: name.trim(),
      isDeleted: { $ne: true }
    });

    if (existingCategory) {
      return NextResponse.json({
        success: false,
        message: 'Category already exists'
      }, { status: 400 });
    }

    // Create new category
    const newCategory = {
      name: name.trim(),
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: createdBy || null
    };

    const result = await categoriesCollection.insertOne(newCategory);
    

    // Log the activity
    const username = createdBy || 'Unknown User';
    await logActivity(
      username,
      `Created new category: "${name.trim()}"`,
      'category_created'
    );

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      category: {
        id: result.insertedId.toString(),
        name: newCategory.name,
        createdAt: newCategory.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to create category'
    }, { status: 500 });
  }
}