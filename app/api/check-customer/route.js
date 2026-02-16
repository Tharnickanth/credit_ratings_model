// app/api/check-customer/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';

// NIC Validation Function
function validateNIC(nic) {
  if (!nic || typeof nic !== 'string') {
    return { valid: false, message: 'NIC is required' };
  }

  const trimmedNic = nic.trim();

  if (!trimmedNic) {
    return { valid: false, message: 'NIC is required' };
  }

  // Check length (must be 10 or 12 characters)
  if (trimmedNic.length !== 10 && trimmedNic.length !== 12) {
    return { 
      valid: false, 
      message: 'NIC must be exactly 10 or 12 characters' 
    };
  }

  // Validate based on length
  if (trimmedNic.length === 10) {
    // 10 characters: first 9 must be digits, 10th must be X or V
    const first9Digits = /^[0-9]{9}$/;
    const last1Letter = /^[xXvV]$/;
    
    if (!first9Digits.test(trimmedNic.substring(0, 9))) {
      return { 
        valid: false, 
        message: 'For 10-character NIC: first 9 characters must be numbers' 
      };
    }
    
    if (!last1Letter.test(trimmedNic.charAt(9))) {
      return { 
        valid: false, 
        message: 'For 10-character NIC: last character must be X or V' 
      };
    }
  } else if (trimmedNic.length === 12) {
    // 12 characters: all must be digits
    const allDigits = /^[0-9]{12}$/;
    
    if (!allDigits.test(trimmedNic)) {
      return { 
        valid: false, 
        message: 'For 12-character NIC: all characters must be numbers' 
      };
    }
  }

  return { valid: true, message: 'Valid NIC' };
}

export async function POST(request) {
  try {
    
    const { customerId, nic } = await request.json();

    // Validation - at least one field required
    if (!customerId?.trim() && !nic?.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Please provide Customer ID or NIC to check customer status'
      }, { status: 400 });
    }

    // Validate NIC format if provided
    if (nic?.trim()) {
      const nicValidation = validateNIC(nic);
      if (!nicValidation.valid) {
        return NextResponse.json({
          success: false,
          message: nicValidation.message
        }, { status: 400 });
      }
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const customersCollection = db.collection('customers');

    // Build query to check customers collection
    const query = { isDeleted: { $ne: true } };
    
    // Use OR condition if both fields are provided, otherwise use single field
    if (customerId?.trim() && nic?.trim()) {
      query.$or = [
        { customerId: customerId.trim() },
        { nic: nic.trim() }
      ];
    } else if (customerId?.trim()) {
      query.customerId = customerId.trim();
    } else if (nic?.trim()) {
      query.nic = nic.trim();
    }


    // Find customer in customers collection
    const customer = await customersCollection.findOne(query);

    if (customer) {
      
      return NextResponse.json({
        success: true,
        customerType: 'existing',
        message: 'Existing customer found in database',
        customerData: {
          customerName: customer.customerName,
          customerId: customer.customerId,
          nic: customer.nic,
          contactNumber: customer.contactNumber || '',
          email: customer.email || '',
          address: customer.address || '',
          createdAt: customer.createdAt
        }
      }, { status: 200 });
    } else {
      
      return NextResponse.json({
        success: true,
        customerType: 'new',
        message: 'New customer - not found in database',
        customerData: null
      }, { status: 200 });
    }

  } catch (error) {
    console.error('❌ Error checking customer:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to check customer status'
    }, { status: 500 });
  }
}