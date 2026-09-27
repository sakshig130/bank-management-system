import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Users, 
  CreditCard, 
  History, 
  LogOut, 
  Building2,
  Download,
  Edit,
  Trash2,
  Plus,
  Minus,
  ArrowRightLeft,
  Mail,
  Phone,
  Calendar,
  Filter,
  Search
} from 'lucide-react';

const StaffDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [pendingCustomers, setPendingCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionForm, setTransactionForm] = useState({
    accountNo: '',
    amount: '',
    description: '',
    toAccountNo: ''
  });
  const [transactionType, setTransactionType] = useState('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchPendingCustomers();
    fetchTransactions();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

  useEffect(() => {
    fetchTransactions();
  }, [filterDate, filterType]);

  const fetchCustomers = async () => {
    try {
      const params = searchTerm ? `?search=${searchTerm}` : '';
      const response = await axios.get(`http://localhost:5000/api/accounts/customers${params}`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchPendingCustomers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users/pending');
      setPendingCustomers(response.data);
    } catch (error) {
      console.error('Error fetching pending customers:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterType) params.append('type', filterType);
      
      const response = await axios.get(`http://localhost:5000/api/transactions/all?${params}`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleCreateAccount = async (customerId) => {
    const initialDeposit = prompt('Enter initial deposit amount (optional):');
    try {
      const response = await axios.post(`http://localhost:5000/api/accounts/create/${customerId}`, {
        initialDeposit: initialDeposit ? parseFloat(initialDeposit) : 0
      });
      alert('Account created successfully!');
      fetchCustomers();
      fetchPendingCustomers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating account');
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let endpoint = '';
      let data = {
        accountNo: transactionForm.accountNo,
        amount: parseFloat(transactionForm.amount),
        description: transactionForm.description
      };

      switch (transactionType) {
        case 'deposit':
          endpoint = 'http://localhost:5000/api/transactions/deposit';
          break;
        case 'withdraw':
          endpoint = 'http://localhost:5000/api/transactions/withdraw';
          break;
        case 'transfer':
          endpoint = 'http://localhost:5000/api/transactions/transfer';
          data = {
            fromAccountNo: transactionForm.accountNo,
            toAccountNo: transactionForm.toAccountNo,
            amount: parseFloat(transactionForm.amount),
            description: transactionForm.description
          };
          break;
      }

      const response = await axios.post(endpoint, data);
      
      if (response.data.pdfFilename) {
        // Download PDF
        window.open(`http://localhost:5000/api/transactions/download/${response.data.pdfFilename}`, '_blank');
      }

      alert(`${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} successful!`);
      setShowTransactionModal(false);
      setTransactionForm({ accountNo: '', amount: '', description: '', toAccountNo: '' });
      fetchCustomers();
      fetchTransactions();
    } catch (error) {
      alert(error.response?.data?.message || `${transactionType} failed`);
    }

    setLoading(false);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`http://localhost:5000/api/accounts/customer/${editingCustomer._id}`, {
        name: editingCustomer.name,
        address: editingCustomer.address,
        phone: editingCustomer.phone,
        email: editingCustomer.email
      });
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating customer');
    }

    setLoading(false);
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer? This will also delete all their transactions.')) {
      try {
        await axios.delete(`http://localhost:5000/api/accounts/customer/${id}`);
        fetchCustomers();
      } catch (error) {
        alert('Error deleting customer');
      }
    }
  };

  const downloadPassbook = async (accountNo) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/accounts/balance/${accountNo}`);
      if (response.data.pdfFilename) {
        window.open(`http://localhost:5000/api/accounts/download/${response.data.pdfFilename}`, '_blank');
      }
    } catch (error) {
      alert('Error generating passbook');
    }
  };

  const downloadDateWiseReport = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.append('date', filterDate);
      if (filterType) params.append('type', filterType);
      
      const response = await axios.get(`http://localhost:5000/api/transactions/report/pdf?${params}`);
      if (response.data.pdfFilename) {
        window.open(`http://localhost:5000/api/transactions/download/${response.data.pdfFilename}`, '_blank');
      }
    } catch (error) {
      alert('Error generating report');
    }
  };

  const openTransactionModal = (type, accountNo = '') => {
    setTransactionType(type);
    setTransactionForm({ ...transactionForm, accountNo });
    setShowTransactionModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {user.name}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'customers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Customer List
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <CreditCard className="h-4 w-4 inline mr-2" />
              Pending Accounts
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <History className="h-4 w-4 inline mr-2" />
              My Transaction History
            </button>
          </nav>
        </div>

        {/* Customer List Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Customer Accounts</h2>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, account no, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-80"
                />
              </div>
            </div>
            
            {/* Edit Customer Modal */}
            {editingCustomer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">Edit Customer</h3>
                  <form onSubmit={handleUpdateCustomer} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={editingCustomer.name}
                      onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={editingCustomer.email}
                      onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={editingCustomer.phone}
                      onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <textarea
                      placeholder="Address"
                      value={editingCustomer.address}
                      onChange={(e) => setEditingCustomer({...editingCustomer, address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      required
                    />
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Updating...' : 'Update Customer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCustomer(null)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.accountNo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">₹{customer.balance}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {customer.phone}
                          </div>
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => downloadPassbook(customer.accountNo)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingCustomer(customer)}
                            className="text-yellow-600 hover:text-yellow-900 transition-colors"
                            title="Edit Customer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer._id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openTransactionModal('deposit', customer.accountNo)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Deposit"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openTransactionModal('withdraw', customer.accountNo)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Withdraw"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openTransactionModal('transfer', customer.accountNo)}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                            title="Transfer"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Accounts Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Pending Account Creations</h2>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingCustomers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.address}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {customer.phone}
                          </div>
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div>Aadhar: {customer.aadharNo}</div>
                          <div>PAN: {customer.panNo}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleCreateAccount(customer._id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          Create Account
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transaction History Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">My Transaction History</h2>
              <div className="flex space-x-4">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAWAL">Withdrawal</option>
                  <option value="TRANSFER_IN">Transfer In</option>
                  <option value="TRANSFER_OUT">Transfer Out</option>
                </select>
                <button
                  onClick={downloadDateWiseReport}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.customerName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{transaction.accountNo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.type === 'DEPOSIT' ? 'bg-green-100 text-green-800' :
                          transaction.type === 'WITHDRAWAL' ? 'bg-red-100 text-red-800' :
                          transaction.type === 'TRANSFER_IN' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {transaction.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">₹{transaction.amount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">₹{transaction.balance}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openTransactionModal('deposit', transaction.accountNo)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Deposit"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openTransactionModal('withdraw', transaction.accountNo)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Withdraw"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openTransactionModal('transfer', transaction.accountNo)}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                            title="Transfer"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transaction Modal */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 capitalize">
                {transactionType} Money
              </h3>
              <form onSubmit={handleTransaction} className="space-y-4">
                <input
                  type="text"
                  placeholder="Account Number"
                  value={transactionForm.accountNo}
                  onChange={(e) => setTransactionForm({...transactionForm, accountNo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                {transactionType === 'transfer' && (
                  <input
                    type="text"
                    placeholder="To Account Number"
                    value={transactionForm.toAccountNo}
                    onChange={(e) => setTransactionForm({...transactionForm, toAccountNo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                )}
                <input
                  type="number"
                  placeholder="Amount"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  min="1"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 capitalize"
                  >
                    {loading ? 'Processing...' : transactionType}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransactionModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;