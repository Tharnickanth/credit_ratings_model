import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://tharnimo_db_user:TrFAkcAgvDI9TWrC@creditratingsmodel.iajai7i.mongodb.net/?appName=CreditRatingsModel';
const options = {};

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default clientPromise;