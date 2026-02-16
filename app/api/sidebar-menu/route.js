// app/api/sidebar-menu/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Permission from '@/models/Permission';
import UserPrivilege from '@/models/UserPrivilege';

export async function GET(request) {
  try {

    
    await connectDB();


    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

 

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Step 1: Fetch user privileges (approved pages)
 
    const userPrivilege = await UserPrivilege.findOne({ 
      userId, 
      status: 'active' 
    });

 

    if (!userPrivilege || !userPrivilege.pages || userPrivilege.pages.length === 0) {

      return NextResponse.json({
        success: true,
        data: [],
        message: 'No menu items available for this user'
      });
    }

    // Get approved page names
    const approvedPageNames = userPrivilege.pages
      .filter(page => page.isApproved)
      .map(page => page.pageName);



    if (approvedPageNames.length === 0) {

      return NextResponse.json({
        success: true,
        data: [],
        message: 'No approved pages for this user'
      });
    }

    // Step 2: Fetch all active permissions

    const permissions = await Permission.find({ status: 'active' });
    

    // Step 3: Separate categories and permissions
    const categories = permissions
      .filter(item => item.type === 'category')
      .sort((a, b) => a.position - b.position);

    const permissionsList = permissions
      .filter(item => item.type === 'permission')
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return (a.subPosition || 0) - (b.subPosition || 0);
      });



    // Step 4: Build menu structure
    const menuItems = [];

    for (const category of categories) {
      // Find subcategories for this category
      const subItems = permissionsList
        .filter(perm => perm.category === category.name)
        .filter(perm => approvedPageNames.includes(perm.pagename))
        .map(perm => ({
          id: convertToMenuId(perm.pagename),
          label: perm.label || perm.subCategory,
          icon: perm.icon || 'FileCheck',
          pagename: perm.pagename,
          position: perm.position,
          subPosition: perm.subPosition || 0
        }));

      // Check if category is directly approved (for categories without subcategories)
      const isCategoryDirectlyApproved = approvedPageNames.includes(category.name) || 
                                          approvedPageNames.includes(`${category.name}.jsx`);

      // Only include category if it has approved subitems or is directly approved
      if (subItems.length > 0 || isCategoryDirectlyApproved) {
        const menuItem = {
          id: convertToMenuId(category.name),
          icon: category.icon || 'Settings',
          label: category.name,
          position: category.position,
          description: category.description || ''
        };

        if (subItems.length > 0) {
          menuItem.subItems = subItems;
        }

        menuItems.push(menuItem);
      }
    }

   

    return NextResponse.json({
      success: true,
      data: menuItems,
      message: 'Menu items fetched successfully'
    });

  } catch (error) {
    console.error('Error fetching sidebar menu:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch sidebar menu',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to convert page name to menu ID format
function convertToMenuId(pagename) {
  if (!pagename) return '';
  
  // Remove .jsx extension
  let id = pagename.replace('.jsx', '');
  
  // Convert PascalCase to kebab-case
  id = id
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
  
  return id;
}