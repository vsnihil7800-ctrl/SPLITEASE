const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendVerificationEmail = async (toEmail, verifyLink) => {
  await transporter.sendMail({
    from: `"SplitEase Stay" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Verify your SplitEase Stay account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Verify your email</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
          Thanks for signing up for SplitEase Stay! Click the button below to verify your email address.
          This link expires in <strong>30 minutes</strong>.
        </p>
        <a href="${verifyLink}"
           style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
          Verify email
        </a>
        <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail };
