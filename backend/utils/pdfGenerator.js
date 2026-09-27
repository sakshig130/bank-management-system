import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const generatePassbookPDF = (customer, transactions) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const filename = `passbook_${customer.accountNo}_${Date.now()}.pdf`;
      const filepath = path.join(process.cwd(), 'temp', filename);

      // Ensure temp directory exists
      if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
        fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filepath));

      // Header
      doc.fontSize(20).text('BANK PASSBOOK', 50, 50);
      doc.fontSize(12).text(`Account No: ${customer.accountNo}`, 50, 80);
      doc.text(`Name: ${customer.name}`, 50, 100);
      doc.text(`Address: ${customer.address}`, 50, 120);
      doc.text(`Phone: ${customer.phone}`, 50, 140);
      doc.text(`Email: ${customer.email}`, 50, 160);
      doc.text(`Current Balance: ₹${customer.balance}`, 50, 180);

      // Transaction history
      doc.fontSize(16).text('Transaction History', 50, 220);
      
      let yPosition = 250;
      doc.fontSize(10);
      doc.text('Date', 50, yPosition);
      doc.text('Type', 150, yPosition);
      doc.text('Amount', 250, yPosition);
      doc.text('Balance', 350, yPosition);
      doc.text('Description', 450, yPosition);

      yPosition += 20;
      transactions.forEach(transaction => {
        doc.text(new Date(transaction.createdAt).toLocaleDateString(), 50, yPosition);
        doc.text(transaction.type, 150, yPosition);
        doc.text(`₹${transaction.amount}`, 250, yPosition);
        doc.text(`₹${transaction.balance}`, 350, yPosition);
        doc.text(transaction.description || '-', 450, yPosition);
        yPosition += 15;
      });

      doc.end();

      doc.on('end', () => {
        resolve({ filename, filepath });
      });

    } catch (error) {
      reject(error);
    }
  });
};

export const generateTransactionPDF = (transaction, customer) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const filename = `transaction_${transaction._id}_${Date.now()}.pdf`;
      const filepath = path.join(process.cwd(), 'temp', filename);

      // Ensure temp directory exists
      if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
        fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filepath));

      // Header
      doc.fontSize(20).text('TRANSACTION RECEIPT', 50, 50);
      doc.fontSize(12).text(`Transaction ID: ${transaction._id}`, 50, 80);
      doc.text(`Date: ${new Date(transaction.createdAt).toLocaleString()}`, 50, 100);
      doc.text(`Account No: ${transaction.accountNo}`, 50, 120);
      doc.text(`Customer Name: ${customer.name}`, 50, 140);
      doc.text(`Transaction Type: ${transaction.type}`, 50, 160);
      doc.text(`Amount: ₹${transaction.amount}`, 50, 180);
      doc.text(`Balance After Transaction: ₹${transaction.balance}`, 50, 200);
      
      if (transaction.toAccountNo) {
        doc.text(`To Account: ${transaction.toAccountNo}`, 50, 220);
      }
      if (transaction.fromAccountNo) {
        doc.text(`From Account: ${transaction.fromAccountNo}`, 50, 220);
      }

      doc.end();

      doc.on('end', () => {
        resolve({ filename, filepath });
      });

    } catch (error) {
      reject(error);
    }
  });
};

export const generateTransactionReportPDF = (transactions, date, type) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const filename = `transaction_report_${date || 'all'}_${type || 'all'}_${Date.now()}.pdf`;
      const filepath = path.join(process.cwd(), 'temp', filename);

      // Ensure temp directory exists
      if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
        fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filepath));

      // Header
      doc.fontSize(20).text('TRANSACTION REPORT', 50, 50);
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, 50, 80);
      
      if (date) {
        doc.text(`Date Filter: ${new Date(date).toLocaleDateString()}`, 50, 100);
      }
      if (type) {
        doc.text(`Type Filter: ${type}`, 50, 120);
      }
      
      doc.text(`Total Transactions: ${transactions.length}`, 50, 140);
      
      // Calculate totals
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const depositTotal = transactions.filter(t => t.type === 'DEPOSIT').reduce((sum, t) => sum + t.amount, 0);
      const withdrawalTotal = transactions.filter(t => t.type === 'WITHDRAWAL').reduce((sum, t) => sum + t.amount, 0);
      const transferTotal = transactions.filter(t => t.type === 'TRANSFER_OUT').reduce((sum, t) => sum + t.amount, 0);
      
      doc.text(`Total Amount: ₹${totalAmount}`, 50, 160);
      doc.text(`Deposits: ₹${depositTotal}`, 50, 180);
      doc.text(`Withdrawals: ₹${withdrawalTotal}`, 50, 200);
      doc.text(`Transfers: ₹${transferTotal}`, 50, 220);

      // Transaction list
      doc.fontSize(16).text('Transaction Details', 50, 250);
      
      let yPosition = 280;
      doc.fontSize(10);
      doc.text('Date', 50, yPosition);
      doc.text('Customer', 120, yPosition);
      doc.text('Account', 200, yPosition);
      doc.text('Type', 280, yPosition);
      doc.text('Amount', 350, yPosition);
      doc.text('Balance', 420, yPosition);

      yPosition += 20;
      transactions.forEach(transaction => {
        if (yPosition > 750) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.text(new Date(transaction.createdAt).toLocaleDateString(), 50, yPosition);
        doc.text(transaction.customerName.substring(0, 12), 120, yPosition);
        doc.text(transaction.accountNo, 200, yPosition);
        doc.text(transaction.type, 280, yPosition);
        doc.text(`₹${transaction.amount}`, 350, yPosition);
        doc.text(`₹${transaction.balance}`, 420, yPosition);
        yPosition += 15;
      });

      doc.end();

      doc.on('end', () => {
        resolve({ filename, filepath });
      });

    } catch (error) {
      reject(error);
    }
  });
};