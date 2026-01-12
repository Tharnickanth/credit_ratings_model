// app/api/login-logs/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request) {
  try {
    console.log('=== API GET Login Logs Request Started ===');
    
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const status = searchParams.get('status');
    const stage = searchParams.get('stage');
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit')) || 100;
    const page = parseInt(searchParams.get('page')) || 1;
    
    console.log('Query params:', { username, status, stage, source, startDate, endDate, limit, page });
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('crm_db');
    const loginLogsCollection = db.collection('login_logs');
    console.log('Connected to MongoDB successfully');

    // Build filter query
    const filter = {};
    
    if (username) {
      filter.username = { $regex: username, $options: 'i' }; // Case-insensitive search
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (stage && stage !== 'all') {
      filter.stage = stage;
    }
    
    if (source && source !== 'all') {
      filter.source = source;
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.loginAt = {};
      if (startDate) {
        filter.loginAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.loginAt.$lte = endDateTime;
      }
    }
    
    console.log('Applied filter:', JSON.stringify(filter));

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch login logs with filter, sorting, and pagination
    const logs = await loginLogsCollection
      .find(filter)
      .sort({ loginAt: -1 }) // Sort by login time, newest first
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination
    const totalCount = await loginLogsCollection.countDocuments(filter);

    console.log(`Found ${logs.length} login logs out of ${totalCount} total`);
    
    // Convert MongoDB _id to string for JSON serialization
    const logsWithStringId = logs.map(log => ({
      ...log,
      _id: log._id.toString()
    }));

    return NextResponse.json({ 
      logs: logsWithStringId,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('=== Error Fetching Login Logs ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// POST endpoint - for future use if you want to add login logs via API
export async function POST(request) {
  try {
    console.log('=== API POST Login Log Request Started ===');
    
    const body = await request.json();
    console.log('Received data:', body);
    
    const { username, stage, status, source, ip, userAgent } = body;

    // Validate required fields
    if (!username || !stage || !status || !source) {
      console.log('Validation failed: Missing fields');
      return NextResponse.json(
        { error: 'Username, stage, status, and source are required' },
        { status: 400 }
      );
    }

    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('crm_db');
    const loginLogsCollection = db.collection('login_logs');
    console.log('Connected to MongoDB successfully');

    // Create login log object
    const newLog = {
      username,
      loginAt: new Date(),
      stage,
      status,
      source,
      ip: ip || null,
      userAgent: userAgent || null
    };

    // Insert log into database
    console.log('Inserting login log into database...');
    const result = await loginLogsCollection.insertOne(newLog);
    console.log('Login log inserted successfully. ID:', result.insertedId);

    return NextResponse.json(
      { 
        message: 'Login log created successfully', 
        log: { ...newLog, _id: result.insertedId.toString() }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('=== Error Creating Login Log ===');
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}