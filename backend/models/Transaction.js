import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  accountNo: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  toAccountNo: {
    type: String,
    default: null
  },
  fromAccountNo: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  balance: {
    type: Number,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('Transaction', transactionSchema);