import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  aadharNo: {
    type: String,
    required: true,
    unique: true
  },
  panNo: {
    type: String,
    required: true,
    unique: true
  },
  accountNo: {
    type: String,
    unique: true,
    sparse: true
  },
  balance: {
    type: Number,
    default: 0
  },
  isAccountCreated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('Customer', customerSchema);