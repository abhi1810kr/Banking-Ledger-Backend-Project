const express = require('express');
const cookieParser = require('cookie-parser')

const authRouter = require('./routes/auth.routes')
const accountRouter = require('./routes/account.routes')
const transactionRouter = require('./routes/transaction.route')

const app = express();

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', frontendOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    return next();
});

app.use(express.json());
app.use(cookieParser())

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRouter)

module.exports = app;