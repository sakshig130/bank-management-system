import express from 'express';
import Customer from '../models/Customer.js';
import Transaction from '../models/Transaction.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { generatePassbookPDF } from '../utils/pdfGenerator.js';
import { sendAccountCreationEmail } from '../utils/emailService.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Create account for customer (Staff only)
router.post('/create/:customerId', authenticate, authorize(['STAFF']), async (req, res) => {
  try {
    const { customerId } = req.params;
    const { initialDeposit } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.isAccountCreated) {
      return res.status(400).json({ message: 'Account already created for this customer' });
    }

    // Generate unique account number
    const accountNo = 'ACC' + Date.now() + Math.floor(Math.random() * 1000);
    
    customer.accountNo = accountNo;
    customer.balance = initialDeposit || 0;
    customer.isAccountCreated = true;

    await customer.save();

    // Create initial deposit transaction if amount > 0
    if (initialDeposit > 0) {
      const transaction = new Transaction({
        accountNo,
        type: 'DEPOSIT',
        amount: initialDeposit,
        description: 'Initial deposit',
        balance: initialDeposit
      });
      await transaction.save();
    }

    // Generate passbook PDF
    const transactions = await Transaction.find({ accountNo }).sort({ createdAt: -1 });
    const pdfData = await generatePassbookPDF(customer, transactions);

    // Send email notification
    await sendAccountCreationEmail(customer);
    res.json({
      message: 'Account created successfully',
      customer,
      pdfFilename: pdfData.filename
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get customer by account number
router.get('/customer/:accountNo', authenticate, authorize(['STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { accountNo } = req.params;
    const customer = await Customer.findOne({ accountNo, isAccountCreated: true });
    
    if (!customer) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all customers with accounts (Staff/Admin only)
router.get('/customers', authenticate, authorize(['STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { search, staffId } = req.query;
    let filter = { isAccountCreated: true };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { accountNo: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard stats (Admin only)
router.get('/stats', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { date } = req.query;
    
    const totalCustomers = await Customer.countDocuments({ isAccountCreated: true });
    const totalStaff = await (await import('../models/User.js')).default.countDocuments({ role: 'STAFF' });
    
    const customers = await Customer.find({ isAccountCreated: true });
    const totalAmount = customers.reduce((sum, customer) => sum + customer.balance, 0);
    
    // Get date-filtered transactions
    let startDate, endDate;
    if (date) {
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }
    
    const dateTransactions = await Transaction.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    const dateDeposits = dateTransactions
      .filter(t => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const dateWithdrawals = dateTransactions
      .filter(t => t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + t.amount, 0);

    const dateTransfers = dateTransactions
      .filter(t => t.type === 'TRANSFER_OUT')
      .reduce((sum, t) => sum + t.amount, 0);
    
    res.json({
      totalCustomers,
      totalStaff,
      totalAmount,
      dateDeposits,
      dateWithdrawals,
      dateTransfers,
      dateTransactions: dateTransactions.length,
      filterDate: date || new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete customer (Admin only)
router.delete('/customer/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Delete all transactions for this customer
    if (customer.accountNo) {
      await Transaction.deleteMany({ accountNo: customer.accountNo });
    }

    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update customer (Staff/Admin only)
router.put('/customer/:id', authenticate, authorize(['STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { name, address, phone, email },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ message: 'Customer updated successfully', customer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check balance and generate PDF
router.get('/balance/:accountNo', authenticate, authorize(['STAFF']), async (req, res) => {
  try {
    const { accountNo } = req.params;
    const customer = await Customer.findOne({ accountNo, isAccountCreated: true });
    
    if (!customer) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const transactions = await Transaction.find({ accountNo }).sort({ createdAt: -1 }).limit(10);
    const pdfData = await generatePassbookPDF(customer, transactions);

    res.json({
      accountNo: customer.accountNo,
      name: customer.name,
      balance: customer.balance,
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