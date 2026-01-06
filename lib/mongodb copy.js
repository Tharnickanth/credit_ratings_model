import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://tharnimo_db_user:TrFAkcAgvDI9TWrC@creditratingsmodel.iajai7i.mongodb.net/?appName=CreditRatingsModel';


const options = {
  tls: true,
  tlsAllowInvalidCertificates: true, 
};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;