// test-connection.js
// Run this with: node test-connection.js

const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://tharnimo_db_user:TrFAkcAgvDI9TWrC@creditratingsmodel.iajai7i.mongodb.net/crm_db?retryWrites=true&w=majority&appName=CreditRatingsModel";

async function testConnection() {
  console.log('🔄 Attempting to connect to MongoDB...');
  console.log('URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully to MongoDB!');
    
    const db = client.db('crm_db');
    const collections = await db.listCollections().toArray();
    
    console.log('📦 Collections found:', collections.map(c => c.name));
    
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log('👥 User count:', userCount);
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.message.includes('ECONNRESET')) {
      console.error('\n⚠️  ECONNRESET Error - This usually means:');
      console.error('   1. IP Address not whitelisted in MongoDB Atlas');
      console.error('   2. Firewall blocking the connection');
      console.error('   3. VPN interfering with connection');
      console.error('   4. Cluster is paused or unavailable');
    }
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

testConnection();