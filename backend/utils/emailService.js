const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendVerificationEmail = async (options) => {
  const { to, name, token } = options;
  const verifyLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject: "Verify your SplitEase Stay email",
    html: `<div style="font-family:sans-serif;padding:32px;"><h2>Hey ${name}, verify your email</h2><p>Click below to verify. Expires in 30 minutes.</p><a href="${verifyLink}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Verify email</a></div>`,
  });
};

const sendPasswordResetEmail = async (options) => {
  const { to, name, token } = options;
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject: "Reset your SplitEase Stay password",
    html: `<div style="font-family:sans-serif;padding:32px;"><h2>Hey ${name}, reset your password</h2><p>Click below. Expires in 30 minutes.</p><a href="${resetLink}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset password</a></div>`,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };