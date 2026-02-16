// app/api/system-health/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb1';

export async function GET() {
  const healthStatus = {
    database: { status: 'Unknown', message: '', responseTime: 0 },
    api: { status: 'Healthy', message: 'API is responding', responseTime: 0 },
    userSessions: { status: 'Unknown', activeCount: 0 }
  };

  const apiStartTime = Date.now();

  try {
    // Test Database Connection
    const dbStartTime = Date.now();
    const client = await clientPromise;
    const db = client.db('crm_db');
    
    // Ping the database
    await db.admin().ping();
    const dbEndTime = Date.now();
    const dbResponseTime = dbEndTime - dbStartTime;

    healthStatus.database = {
      status: dbResponseTime < 1000 ? 'Healthy' : 'Slow',
      message: `Connected (${dbResponseTime}ms)`,
      responseTime: dbResponseTime
    };

    // Check active user sessions from login logs
    try {
      const logsCollection = db.collection('LoginSessions');
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const recentLogins = await logsCollection
        .find({
          loginAt: { $gte: thirtyMinutesAgo },
          status: 'success'
        })
        .toArray();

      // Count unique users
      const uniqueUsers = [...new Set(recentLogins.map(log => log.username))];
      
      healthStatus.userSessions = {
        status: 'Active',
        activeCount: uniqueUsers.length,
        message: `${uniqueUsers.length} active user(s) in last 30 minutes`
      };
    } catch (sessionError) {
      console.error('Error checking user sessions:', sessionError);
      healthStatus.userSessions = {
        status: 'Unknown',
        activeCount: 0,
        message: 'Unable to check sessions'
      };
    }

  } catch (error) {
    console.error('Database health check failed:', error);
    healthStatus.database = {
      status: 'Error',
      message: error.message || 'Database connection failed',
      responseTime: 0
    };
  }

  const apiEndTime = Date.now();
  healthStatus.api.responseTime = apiEndTime - apiStartTime;

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    health: healthStatus
  });
}