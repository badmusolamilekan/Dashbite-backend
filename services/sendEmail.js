import nodemailer from "nodemailer";

const smtpHost =  "smtp.gmail.com";
const smtpUser =  process.env.EMAIL_USER;
const smtpPass =  process.env.EMAIL_PASS;
const emailFrom = process.env.EMAIL_FROM ;
const smtpPort = 465;
const requiredSettings = [
  ["SMTP_USER or EMAIL_USER", smtpUser],
  ["SMTP_PASS or EMAIL_PASS", smtpPass],
];

const missingSettings = requiredSettings
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (missingSettings.length) {
  console.warn(`Email is disabled. Missing: ${missingSettings.join(", ")}`);
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: process.env.SMTP_SECURE !== "false" && smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
});

const sendEmail = async ({ to, subject, html }) => {
  if (missingSettings.length) {
    throw new Error(`SMTP is not configured: ${missingSettings.join(", ")}`);
  }

  await transporter.sendMail({
    from: emailFrom,
    to,
    subject,
    html,
  });
};

export const verifyEmailConnection = () => transporter.verify();

export const verificationEmail = ({ heading, message, otp, name = "" }) =>
  `<div style="max-width:520px;margin:0 auto;padding:36px 28px;font-family:Arial,sans-serif;color:#252329;background:#faf7f2"><p style="color:#e86b4d;font-size:12px;font-weight:bold;letter-spacing:3px;text-transform:uppercase">DASH</p><h1 style="font-size:28px;margin:18px 0 10px">${heading}${name ? `, ${name}` : ""}</h1><p style="font-size:16px;line-height:1.6;color:#6f665f">${message}</p><div style="margin:28px 0;padding:20px;text-align:center;background:#fff0eb;border-radius:8px"><strong style="font-size:34px;letter-spacing:10px;color:#e86b4d">${otp}</strong></div><p style="font-size:13px;color:#8f867d">This code expires in 10 minutes. If you did not create a Dash account, you can ignore this email.</p></div>`;

export default sendEmail;
