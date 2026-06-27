const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (options) => {
  const { to, name, token } = options;
  const verifyLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject: "Verify your SplitEase Stay email",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;border:1px solid #e5e7eb;border-radius:12px;"><h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Hey ${name}, verify your email</h2><p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Thanks for signing up! Click below to verify. Expires in <strong>30 minutes</strong>.</p><a href="${verifyLink}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Verify email</a><p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">If you didn't sign up, ignore this.</p></div>`,
  });
};

const sendPasswordResetEmail = async (options) => {
  const { to, name, token } = options;
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject: "Reset your SplitEase Stay password",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;border:1px solid #e5e7eb;border-radius:12px;"><h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Hey ${name}, reset your password</h2><p style="color:#6b7280;font-size:14px;margin:0 0 24px;">We received a reset request. Click below — expires in <strong>30 minutes</strong>.</p><a href="${resetLink}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Reset password</a><p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">If you didn't request this, ignore this.</p></div>`,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
