const {Router} = require('express');
const transactionController = require('../controllers/transaction.controller');
const authMiddleware = require('../middlewares/auth.middleware');


const transactionRouter = Router();

transactionRouter.post("/", authMiddleware.authMiddleware, transactionController.createTransactionController);

transactionRouter.post("/admin/initial-funds", authMiddleware.adminMiddleware, transactionController.adminCreateTransactionController);    

module.exports = transactionRouter;