import express from "express";
import * as db from './src/config/initialData.js';
import userRoutes from './src/modules/user/routes/UserRoutes.js';
import checkToken from "./src/config/auth/checkToken.js";

const app = express();
const env = process.env;
const PORT = env.PORT || 8080;

db.createInitialData();

app.use(express.json());

app.use(userRoutes);

app.use(checkToken);

app.get('/api/status', (req, res) => {
    return res.status(200).json({
        service: 'Auth API',
        status: 'up', 
        httpStatus: 200,
    });
});

app.listen(PORT, () => {
    console.log(`Server started sucessfully at port ${PORT}`);
});