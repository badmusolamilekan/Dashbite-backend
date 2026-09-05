import nodemailer from "nodemailer";

const emailFrom = process.env.EMAIL_FROM || "no-reply@dashbite.com";

// Create transporter based on available configuration
const createTransporter = () => {
  // SendGrid configuration (recommended for production)
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  // Gmail configuration (try port 587 if 465 fails)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });
  }

  // Fallback: no email configured
  return null;
};

const transporter = createTransporter();

if (!transporter) {
  console.warn("Email is disabled. Set EMAIL_USER/EMAIL_PASS or SENDGRID_API_KEY in environment variables.");
}

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    throw new Error("Email service is not configured");
  }

  const info = await transporter.sendMail({
    from: `"Dashbite" <${emailFrom}>`,
    to,
    subject,
    html,
  });

  console.log(`[EMAIL] Message sent: ${info.messageId}`);
  return info;
};

export const verifyEmailConnection = async () => {
  if (!transporter) {
    return false;
  }
  try {
    await transporter.verify();
    console.log("[EMAIL] SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error(`[EMAIL] SMTP verification failed: ${error.message}`);
    return false;
  }
};

export const verificationEmail = ({ heading, message, otp, name = "" }) =>
  `<div style="max-width:520px;margin:0 auto;padding:36px 28px;font-family:Arial,sans-serif;color:#252329;background:#faf7f2"><p style="color:#e86b4d;font-size:12px;font-weight:bold;letter-spacing:3px;text-transform:uppercase">DASH</p><h1 style="font-size:28px;margin:18px 0 10px">${heading}${name ? `, ${name}` : ""}</h1><p style="font-size:16px;line-height:1.6;color:#6f665f">${message}</p><div style="margin:28px 0;padding:20px;text-align:center;background:#fff0eb;border-radius:8px"><strong style="font-size:34px;letter-spacing:10px;color:#e86b4d">${otp}</strong></div><p style="font-size:13px;color:#8f867d">This code expires in 10 minutes. If you did not create a Dash account, you can ignore this email.</p></div>`;

export default sendEmail;
