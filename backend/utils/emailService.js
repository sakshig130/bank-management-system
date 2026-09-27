import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ✅ Using only user & password with Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // ✅ Ignore self-signed certificate issue
  },
});
export const sendAccountCreationEmail = async (customer) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: customer.email,
    subject: "Bank Account Created Successfully",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Our Bank!</h2>
        <p>Dear ${customer.name},</p>
        <p>Your bank account has been successfully created. Here are your account details:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Account Number:</strong> ${customer.accountNo}</p>
          <p><strong>Account Holder:</strong> ${customer.name}</p>
          <p><strong>Current Balance:</strong> ₹${customer.balance}</p>
          <p><strong>Account Created:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>Thank you for choosing our bank. Your account is now active and ready to use.</p>
        <p>Best regards,<br>Bank Management Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Account creation email sent successfully");
  } catch (error) {
    console.error("Error sending account creation email:", error);
  }
};

export const sendTransactionEmail = async (customer, transaction) => {
  const transactionTypes = {
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    TRANSFER_IN: "Money Received",
    TRANSFER_OUT: "Money Sent",
  };

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: customer.email,
    subject: `Transaction Alert - ${transactionTypes[transaction.type]}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Transaction Alert</h2>
        <p>Dear ${customer.name},</p>
        <p>A transaction has been processed on your account:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Transaction Type:</strong> ${
            transactionTypes[transaction.type]
          }</p>
          <p><strong>Amount:</strong> ₹${transaction.amount}</p>
          <p><strong>Date & Time:</strong> ${new Date(
            transaction.createdAt
          ).toLocaleString()}</p>
          <p><strong>Account Number:</strong> ${transaction.accountNo}</p>
          <p><strong>Current Balance:</strong> ₹${transaction.balance}</p>
          ${
            transaction.description
              ? `<p><strong>Description:</strong> ${transaction.description}</p>`
              : ""
          }
          ${
            transaction.toAccountNo
              ? `<p><strong>To Account:</strong> ${transaction.toAccountNo}</p>`
              : ""
          }
          ${
            transaction.fromAccountNo
              ? `<p><strong>From Account:</strong> ${transaction.fromAccountNo}</p>`
              : ""
          }
        </div>
        <p>If you have any questions about this transaction, please contact our customer service.</p>
        <p>Best regards,<br>Bank Management Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Transaction email sent successfully");
  } catch (error) {
    console.error("Error sending transaction email:", error);
  }
};
