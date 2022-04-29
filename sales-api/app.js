import express from 'express';

import { connectMongoDb } from './src/config/db/mongoDbConfig.js';

const app = express();
const env = process.env;
const PORT = env.PORT || 8082;

connectMongoDb();

app.get('/api/status', (req, res) => {
    return res.status(200).json({
        service: 'Sales-Api',
        status: 'up',
        httpStatus: 200
    });
})

app.listen(PORT, () => {
    console.log(`Server starred successfully on port ${PORT}`);
})