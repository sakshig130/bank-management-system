import express from 'express';
import Customer from '../models/Customer.js';
import Transaction from '../models/Transaction.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { generateTransactionPDF } from '../utils/pdfGenerator.js';
import { sendTransactionEmail } from '../utils/emailService.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Deposit money (Staff only)
router.post('/deposit', authenticate, authorize(['STAFF']), async (req, res) => {
  try {
    const { accountNo, amount, description } = req.body;

    const customer = await Customer.findOne({ accountNo, isAccountCreated: true });
    if (!customer) {
      return res.status(404).json({ message: 'Account not found' });
    }

    customer.balance += parseFloat(amount);
    await customer.save();

    const transaction = new Transaction({
      accountNo,
      type: 'DEPOSIT',
      amount: parseFloat(amount),
      description: description || 'Cash deposit',
      balance: customer.balance,
      performedBy: req.user._id
    });

    await transaction.save();

    // Generate PDF
    const pdfData = await generateTransactionPDF(transaction, customer);

    // Send email notification
    await sendTransactionEmail(customer, transaction);

    res.json({
      message: 'Deposit successful',
      transaction,
      newBalance: customer.balance,
      pdfFilename: pdfData.filename
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Withdraw money (Staff only)
router.post('/withdraw', authenticate, authorize(['STAFF']), async (req, res) => {
  try {
    const { accountNo, amount, description } = req.body;

    const customer = await Customer.findOne({ accountNo, isAccountCreated: true });
    if (!customer) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (customer.balance < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    customer.balance -= parseFloat(amount);
    await customer.save();

    const transaction = new Transaction({
      accountNo,
      type: 'WITHDRAWAL',
      amount: parseFloat(amount),
      description: description || 'Cash withdrawal',
      balance: customer.balance,
      performedBy: req.user._id
    });

    await transaction.save();

    // Generate PDF
    const pdfData = await generateTransactionPDF(transaction, customer);

    // Send email notification
    await sendTransactionEmail(customer, transaction);

    res.json({
      message: 'Withdrawal successful',
      transaction,
      newBalance: customer.balance,
      pdfFilename: pdfData.filename
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Transfer money (Staff only)
router.post('/transfer', authenticate, authorize(['STAFF']), async (req, res) => {
  try {
    const { fromAccountNo, toAccountNo, amount, description } = req.body;

    const fromCustomer = await Customer.findOne({ accountNo: fromAccountNo, isAccountCreated: true });
    const toCustomer = await Customer.findOne({ accountNo: toAccountNo, isAccountCreated: true });

    if (!fromCustomer) {
      return res.status(404).json({ message: 'Source account not found' });
    }
    if (!toCustomer) {
      return res.status(404).json({ message: 'Destination account not found' });
    }

    if (fromCustomer.balance < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient balance in source account' });
    }

    // Update balances
    fromCustomer.balance -= parseFloat(amount);
    toCustomer.balance += parseFloat(amount);

    await fromCustomer.save();
    await toCustomer.save();

    // Create transactions
    const outTransaction = new Transaction({
      accountNo: fromAccountNo,
      type: 'TRANSFER_OUT',
      amount: parseFloat(amount),
      toAccountNo,
      description: description || `Transfer to ${toAccountNo}`,
      balance: fromCustomer.balance,
      performedBy: req.user._id
    });

    const inTransaction = new Transaction({
      accountNo: toAccountNo,
      type: 'TRANSFER_IN',
      amount: parseFloat(amount),
      fromAccountNo,
      description: description || `Transfer from ${fromAccountNo}`,
      balance: toCustomer.balance,
      performedBy: req.user._id
    });

    await outTransaction.save();
    await inTransaction.save();

    // Send email notifications to both customers
    await sendTransactionEmail(fromCustomer, outTransaction);
    await sendTransactionEmail(toCustomer, inTransaction);

    // Generate PDF for sender
    const pdfData = await generateTransactionPDF(outTransaction, fromCustomer);

    res.json({
      message: 'Transfer successful',
      fromAccount: {
        accountNo: fromAccountNo,
        newBalance: fromCustomer.balance
      },
      toAccount: {
        accountNo: toAccountNo,
        newBalance: toCustomer.balance
      },
      pdfFilename: pdfData.filename
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transaction history (Staff/Admin only)
router.get('/history/:accountNo', authenticate, authorize(['STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { accountNo } = req.params;
    const transactions = await Transaction.find({ accountNo }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all transactions for staff panel (Staff/Admin only)
router.get('/all', authenticate, authorize(['STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { date, type, staffId, accountNo } = req.query;
    let filter = {};

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (type) {
      filter.type = type;
    }

    if (accountNo) {
      filter.accountNo = accountNo;
    }
    
    // If staff member and no specific staffId requested, show only their transactions
    if (req.user.role === 'STAFF' && !staffId) {
      filter.performedBy = req.user._id;
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(100); // Limit for performance

    // Get customer details for each transaction
    const transactionsWithCustomer = await Promise.all(
      transactions.map(async (transaction) => {
        const customer = await Customer.findOne({ accountNo: transaction.accountNo });
        const performedByUser = await (await import('../models/User.js')).default.findById(transaction.performedBy);
        return {
          ...transaction.toObject(),
          customerName: customer?.name || 'Unknown',
          performedByName: performedByUser?.name || 'System'
        };
      })
    );

    res.json(transactionsWithCustomer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate date-wise transaction report PDF (Staff/Admin only)
router.get('/report/pdf', authenticate, authorize(['STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { date, type, staffId } = req.query;
    let filter = {};

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (type) {
      filter.type = type;
    }

    // If staff member, only show their transactions
    if (req.user.role === 'STAFF') {
      filter.performedBy = req.user._id;
    }

    const transactions = await Transaction.find(filter).sort({ createdAt: -1 });
    
    // Get customer details for each transaction
    const transactionsWithCustomer = await Promise.all(
      transactions.map(async (transaction) => {
        const customer = await Customer.findOne({ accountNo: transaction.accountNo });
        return {
          ...transaction.toObject(),
          customerName: customer?.name || 'Unknown'
        };
      })
    );

    const { generateTransactionReportPDF } = await import('../utils/pdfGenerator.js');
    const pdfData = await generateTransactionReportPDF(transactionsWithCustomer, date, type);
    
    res.json({
      message: 'Report generated successfully',
      pdfFilename: pdfData.filename
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Download PDF
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(process.cwd(), 'temp', filename);
    
    if (fs.existsSync(filepath)) {
      res.download(filepath);
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;