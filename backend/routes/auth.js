import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Admin creates staff (Admin only)
router.post('/create-staff', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { email, password, name, address, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ 
      email, 
      password, 
      role: 'STAFF', 
      name,
      address,
      phone
    });
    await user.save();

    res.status(201).json({
      message: 'Staff member created successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        address: user.address,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin/Staff Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login and active status
    user.lastLogin = new Date();
    user.isActive = true;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Logout (update active status)
router.post('/logout', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isActive = false;
    await user.save();
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update staff member (Admin only)
router.put('/staff/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { name, email, address, phone } = req.body;
    const staff = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, address, phone },
      { new: true }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.json({ message: 'Staff member updated successfully', staff });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all staff members (Admin only)
router.get('/staff', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const staff = await User.find({ role: 'STAFF' }).select('-password');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete staff member (Admin only)
router.delete('/staff/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;