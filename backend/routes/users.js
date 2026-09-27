import express from 'express';
import Customer from '../models/Customer.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Submit user registration form (public route)
router.post('/register', async (req, res) => {
  try {
    const { name, address, phone, email, aadharNo, panNo } = req.body;

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      $or: [{ aadharNo }, { panNo }, { email }]
    });

    if (existingCustomer) {
      return res.status(400).json({ message: 'Customer already exists with this Aadhar, PAN, or Email' });
    }

    const customer = new Customer({
      name,
      address,
      phone,
      email,
      aadharNo,
      panNo
    });

    await customer.save();

    res.status(201).json({
      message: 'Registration submitted successfully. Your account will be created by bank staff.',
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all pending registrations (Staff only)
router.get('/pending', authenticate, authorize(['STAFF', 'ADMIN']), async (req, res) => {
  try {
    const pendingCustomers = await Customer.find({ isAccountCreated: false });
    res.json(pendingCustomers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all customers (Admin only)
router.get('/all', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const customers = await Customer.find({});
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;