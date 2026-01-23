import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env vars are loaded
dotenv.config({ path: path.join(__dirname, '../.env') });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendInterviewNotifications = async (data) => {
  const { candidate, recruiter, admin, date, time, meetingLink } = data;

  const participants = [
    { role: 'Candidate', email: candidate.email, name: candidate.name },
    { role: 'Recruiter', email: recruiter.email, name: recruiter.name },
    { role: 'Admin', email: admin.email, name: admin.name }
  ];

  const promises = participants.map(participant => {
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'RecruitPro AI'}" <${process.env.FROM_EMAIL}>`,
      to: participant.email,
      subject: `Interview Scheduled: ${participant.role} - ${date}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
          <h2 style="color: #4285f4;">Hello ${participant.name},</h2>
          <p>Your interview has been scheduled with RecruitPro's AI-Powered system.</p>
          <div style="background: #f4f7ff; padding: 20px; border-radius: 8px;">
            <p><strong>Role:</strong> ${participant.role}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Proctored Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
          </div>
          <p style="margin-top: 20px;">Please ensure you are in a quiet environment and have your ID ready for the proctored session.</p>
          <p>Best regards,<br/>RecruitPro Team</p>
        </div>
      `
    };

    return transporter.sendMail(mailOptions);
  });

  try {
    await Promise.all(promises);
    console.log(`✅ Interview notifications dispatched to ${participants.length} participants`);
  } catch (error) {
    console.error('❌ Failed to send interview notifications:', error);
  }
};

export const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'RecruitPro AI'}" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: 'Your Password Reset OTP - RecruitPro',
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
        <h2 style="color: #4285f4; text-align: center;">RecruitPro Security</h2>
        <p>Hello,</p>
        <p>You have requested a password reset for your RecruitPro account. Use the code below to verify your identity. This code is valid for 10 minutes.</p>
        
        <div style="background: #f4f7ff; padding: 30px; border-radius: 12px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 12px; color: #1a1a1a;">${otp}</span>
        </div>
        
        <p style="color: #666; font-size: 13px;">If you did not request this code, please ignore this email or contact support if you have concerns.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="text-align: center; font-size: 12px; color: #999;">© 2026 RecruitPro AI. All rights reserved.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP Signal dispatched to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send OTP to ${email}:`, error);
    throw error;
  }
};
