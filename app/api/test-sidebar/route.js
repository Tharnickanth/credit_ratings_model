// app/api/test-sidebar/route.js
// Create this temporary test endpoint to debug your data

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Permission from '@/models/Permission';
import UserPrivilege from '@/models/UserPrivilege';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Test 1: Check database connection
    const dbStatus = 'Connected';

    // Test 2: Get all permissions
    const allPermissions = await Permission.find({});
    
    // Test 3: Get categories
    const categories = await Permission.find({ type: 'category' });
    
    // Test 4: Get permissions (subcategories)
    const permissions = await Permission.find({ type: 'permission' });

    // Test 5: Get user privileges if userId provided
    let userPrivilege = null;
    if (userId) {
      userPrivilege = await UserPrivilege.findOne({ userId });
    }

    return NextResponse.json({
      success: true,
      debug: {
        databaseStatus: dbStatus,
        userId: userId || 'Not provided',
        counts: {
          totalPermissions: allPermissions.length,
          categories: categories.length,
          permissions: permissions.length,
          userPrivileges: userPrivilege ? userPrivilege.pages?.length : 0
        },
        sampleData: {
          categories: categories.slice(0, 2).map(c => ({
            name: c.name,
            icon: c.icon,
            position: c.position
          })),
          permissions: permissions.slice(0, 2).map(p => ({
            category: p.category,
            label: p.label,
            pagename: p.pagename,
            icon: p.icon
          })),
          userApprovedPages: userPrivilege?.pages?.filter(p => p.isApproved).map(p => p.pageName) || []
        }
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}