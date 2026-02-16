// app/api/login-logs/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const limit = parseInt(searchParams.get('limit') || '1000');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('crm_db');
    const loginSessionsCollection = db.collection('LoginSessions');

    // Fetch login sessions for the user that are verified (successful logins)
    const logs = await loginSessionsCollection
      .find({ 
        username: username,
        verified: true,
        status: 'success'
      })
      .sort({ loginAt: -1 })
      .limit(limit)
      .toArray();

    // Format the logs to match the expected structure
    const formattedLogs = logs.map(log => ({
      _id: log._id,
      username: log.username,
      userId: log.userId,
      loginAt: log.loginAt || log.verifiedAt || log.createdAt,
      status: log.status || 'success',
      ip: log.ip,
      userAgent: log.userAgent
    }));

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      count: formattedLogs.length
    });

  } catch (error) {
    console.error('Error fetching login logs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch login logs',
        logs: []
      },
      { status: 500 }
    );
  }
}