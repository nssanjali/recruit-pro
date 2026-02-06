import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
    // For development, use Gmail or any SMTP service
    // For production, use SendGrid, AWS SES, or similar
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Email templates
const templates = {
    interviewConfirmationCandidate: (data) => ({
        subject: `Interview Scheduled - ${data.jobTitle}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #4285f4 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                    .detail-label { font-weight: bold; width: 150px; color: #6b7280; }
                    .detail-value { flex: 1; color: #111827; }
                    .button { display: inline-block; background: #4285f4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; color: #6b7280; padding: 20px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Interview Scheduled!</h1>
                    </div>
                    <div class="content">
                        <p>Dear ${data.candidateName},</p>
                        <p>Great news! Your interview has been successfully scheduled.</p>
                        
                        <div class="details">
                            <h3 style="margin-top: 0; color: #111827;">Interview Details</h3>
                            <div class="detail-row">
                                <div class="detail-label">Position:</div>
                                <div class="detail-value">${data.jobTitle}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Date & Time:</div>
                                <div class="detail-value">${data.scheduledAt}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Duration:</div>
                                <div class="detail-value">${data.duration} minutes</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Interviewer:</div>
                                <div class="detail-value">${data.recruiterName}</div>
                            </div>
                            <div class="detail-row" style="border-bottom: none;">
                                <div class="detail-label">Meeting Link:</div>
                                <div class="detail-value"><a href="${data.meetingLink}" style="color: #4285f4;">${data.meetingLink}</a></div>
                            </div>
                        </div>
                        
                        <p>Please join the meeting at the scheduled time. We look forward to speaking with you!</p>
                        
                        <center>
                            <a href="${data.meetingLink}" class="button">Join Meeting</a>
                        </center>
                        
                        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                            <strong>Tips for your interview:</strong><br>
                            • Test your camera and microphone before the interview<br>
                            • Find a quiet, well-lit space<br>
                            • Have your resume and portfolio ready<br>
                            • Join 5 minutes early
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from RecruitPro</p>
                        <p>© ${new Date().getFullYear()} RecruitPro. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    interviewConfirmationRecruiter: (data) => ({
        subject: `Interview Scheduled - ${data.candidateName} for ${data.jobTitle}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                    .detail-label { font-weight: bold; width: 150px; color: #6b7280; }
                    .detail-value { flex: 1; color: #111827; }
                    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
                    .footer { text-align: center; color: #6b7280; padding: 20px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📅 Interview Scheduled</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${data.recruiterName},</p>
                        <p>An interview has been automatically scheduled for you.</p>
                        
                        <div class="details">
                            <h3 style="margin-top: 0; color: #111827;">Interview Details</h3>
                            <div class="detail-row">
                                <div class="detail-label">Candidate:</div>
                                <div class="detail-value">${data.candidateName}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Position:</div>
                                <div class="detail-value">${data.jobTitle}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Date & Time:</div>
                                <div class="detail-value">${data.scheduledAt}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Duration:</div>
                                <div class="detail-value">${data.duration} minutes</div>
                            </div>
                            <div class="detail-row" style="border-bottom: none;">
                                <div class="detail-label">Meeting Link:</div>
                                <div class="detail-value"><a href="${data.meetingLink}" style="color: #8b5cf6;">${data.meetingLink}</a></div>
                            </div>
                        </div>
                        
                        <p>Please review the candidate's profile before the interview.</p>
                        
                        <center>
                            <a href="${data.resumeLink}" class="button">View Resume</a>
                            <a href="${data.meetingLink}" class="button">Join Meeting</a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from RecruitPro</p>
                        <p>© ${new Date().getFullYear()} RecruitPro. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    reminder24h: (data) => ({
        subject: `Reminder: Interview Tomorrow - ${data.jobTitle}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
                    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; color: #6b7280; padding: 20px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏰ Interview Reminder</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${data.name},</p>
                        <p>This is a friendly reminder that you have an interview scheduled for <strong>tomorrow</strong>.</p>
                        
                        <div class="highlight">
                            <h3 style="margin-top: 0; color: #111827;">Interview Details</h3>
                            <p><strong>Position:</strong> ${data.jobTitle}</p>
                            <p><strong>Date & Time:</strong> ${data.scheduledAt}</p>
                            <p><strong>Meeting Link:</strong> <a href="${data.meetingLink}" style="color: #10b981;">${data.meetingLink}</a></p>
                        </div>
                        
                        <p>See you tomorrow!</p>
                        
                        <center>
                            <a href="${data.meetingLink}" class="button">Join Meeting</a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>This is an automated reminder from RecruitPro</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    reminder1h: (data) => ({
        subject: `Interview Starting Soon - ${data.jobTitle}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .urgent { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f59e0b; }
                    .button { display: inline-block; background: #f59e0b; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-size: 18px; font-weight: bold; }
                    .footer { text-align: center; color: #6b7280; padding: 20px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔔 Interview Starting Soon!</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${data.name},</p>
                        
                        <div class="urgent">
                            <h2 style="margin-top: 0; color: #92400e;">Your interview is starting in 1 hour!</h2>
                            <p><strong>Meeting Link:</strong> <a href="${data.meetingLink}" style="color: #f59e0b;">${data.meetingLink}</a></p>
                        </div>
                        
                        <p>Please join on time. Good luck!</p>
                        
                        <center>
                            <a href="${data.meetingLink}" class="button">JOIN NOW</a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>This is an automated reminder from RecruitPro</p>
                    </div>
                </div>
            </body>
            </html>
        `
    })
};

// Send email function
export const sendEmail = async (to, templateName, data) => {
    try {
        const transporter = createTransporter();
        const template = templates[templateName](data);

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to,
            subject: template.subject,
            html: template.html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
};

export default { sendEmail, templates };
