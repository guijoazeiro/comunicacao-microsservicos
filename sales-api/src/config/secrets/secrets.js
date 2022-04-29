const env = process.env;

export const MONGO_DB_URL = env.MONGO_DB_URL
    ? env.MONGO_DB_URL
    : "mongodb://localhost:27017"
