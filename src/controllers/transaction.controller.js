const transactionModel = require('../models/transaction.model');
const ledgerModel = require('../models/ledger.model');
const accountModel = require('../models/account.model');
const emailService = require('../services/email.service');
const mongoose = require('mongoose');


/*
*Create anew transaction
The 10 step transfer flow
1. Validate request
2. Validate idempotency key
3. Validate fromAccount and toAccount status
4. Validate fromAccount balance
5. Create transaction with status PENDING
6. Create DEBIT ledger entry for fromAccount
7. Create CREDIT ledger entry for toAccount
8. Update transaction status to COMPLETED
9. Commit mongoDB session
10. Send email notification to both users

*/

async function createTransactionController(req, res){


    // VALIDATE REQUEST
    const {fromAccount, toAccount, amount, idempotencyKey} = req.body;

    if(!fromAccount || !toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message:"Missing required fields"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    });

    const toUserAccount = await accountModel.findOne({ 
        _id: toAccount,
     })

     if(!fromUserAccount || !toUserAccount){
        return res.status(404).json({
            message:"Sender or Receiver accounts not found"
        })
     }

     // VALIDATE IDEMPOTENCY KEY

    const isTransactionExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
     })

     if(isTransactionExists){
       if(isTransactionExists.status === 'COMPLETED'){
        return res.status(200).json({
            message:"Transaction already completed",
            transaction: isTransactionExists
        })
       }

       if(isTransactionExists.status === 'PENDING'){
        return res.status(200).json({
            message:"Transaction is still pending",
        })
       }

       if(isTransactionExists.status === 'FAILED'){
        return res.status(500).json({
            message:"Transaction failed previously, please try again",
        })
       }
       if(isTransactionExists.status === 'REVERSED'){
        return res.status(500).json({
            message:"Transaction was reversed previously, please try again",
        })
       }
     }

     // validate fromAccount and toAccount status
     if(fromUserAccount.status !== 'ACTIVE' || toUserAccount.status !== 'ACTIVE'){
        return res.status(400).json({
            message:"Sender or Receiver accounts are not active"
        })
     }

     // validate fromAccount balance

     let transaction;
     
     try{
        const balance = await fromUserAccount.getBalance();

     if(balance < amount){
        return res.status(400).json({
            message:`Insufficient balance in sender's account. Current balance is ${balance}. Requested amount is ${amount}`
        })
     }

     // create transaction with status PENDING

     const session = await mongoose.startSession();
     session.startTransaction();

             transaction = (await transactionModel.create([{
                fromAccount,
                toAccount,
                amount,
                idempotencyKey,
                status: 'PENDING'
            }], {session}))[0];

    // create DEBIT ledger entry for fromAccount

     const debitLedgerEntry = await ledgerModel.create([{
        account: fromAccount,
        amount: amount,
        transaction: transaction._id,
        type: 'DEBIT'
     }], {session})

     await (()=>{
        return new Promise((resolve) => setTimeout(resolve, 20 * 1000))
     })();
     
     // create CREDIT ledger entry for toAccount
     const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: 'CREDIT'
     }], {session})

     // update transaction status to COMPLETED

     await transactionModel.findOneAndUpdate(
        {_id: transaction._id},
        {status: 'COMPLETED'},
        {session}
    )

     // commit mongoDB session

     await session.commitTransaction();
     session.endSession();

     // send email notification to both users


     await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toUserAccount._id);

     return res.status(201).json({
        message:"Transaction completed successfully",
        transaction
     })

     }
     catch(err){
        return res.status(400).json({
            message:"Transaction is Pending due to some error, please try again",
        })
     }
}

async function adminCreateTransactionController(req, res){

    // VALIDATE REQUEST
    const {toAccount, amount, idempotencyKey} = req.body;

    if(!toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message:"Missing required fields"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
     })

     if(!toUserAccount){
        return res.status(404).json({
            message:"Receiver account not found"
        })
     }

     const fromUserAccount = await accountModel.findOne({
    
        user: req.user._id
     })

     if(!fromUserAccount){
        return res.status(404).json({
            message:"System user account not found"
        })
     }

     const session = await mongoose.startSession();
     session.startTransaction();

     const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount: toUserAccount._id,
        amount,
        idempotencyKey,
        status: 'PENDING'
     });


     const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: 'DEBIT'
     }], {session})
     
     // create CREDIT ledger entry for toAccount
     const creditLedgerEntry = await ledgerModel.create([{
        account: toUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: 'CREDIT'
     }], {session})

     // update transaction status to COMPLETED

     transaction.status = 'COMPLETED';
     await transaction.save({session});

     // commit mongoDB session

     await session.commitTransaction();
     session.endSession();

     // send email notification to both users


    //  await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toUserAccount._id);

     return res.status(201).json({
        message:"Transaction completed successfully",
        transaction
     })

}


module.exports = {createTransactionController, adminCreateTransactionController};