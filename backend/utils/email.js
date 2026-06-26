const { Resend } = require("resend");

// Lazily initialised so the server doesn't crash on startup if the env var
// is missing (e.g. local dev without a .env file).
let _resend = null;
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_ADDRESS = "SplitEase Stay <onboarding@resend.dev>";
const APP_NAME = "SplitEase Stay";

// ── Send email verification ───────────────────────────────────────────────────
async function sendVerificationEmail({ to, name, token }) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const verifyUrl = `${clientUrl}/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Verify your ${APP_NAME} account`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:700">Hi ${name} 👋</h2>
        <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
          Welcome to ${APP_NAME}! Verify your email address to activate your account.
        </p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#f59e0b;color:#fff;font-weight:600;font-size:15px;
                  padding:12px 28px;border-radius:10px;text-decoration:none">
          Verify email
        </a>
        <p style="margin:24px 0 0;font-size:13px;color:#888">
          Link expires in 24 hours. If you didn't sign up, ignore this email.
        </p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="margin:0;font-size:12px;color:#aaa">
          Or copy this URL into your browser:<br/>
          <span style="color:#555;word-break:break-all">${verifyUrl}</span>
        </p>
      </div>
    `,
  });
}

// ── Send password reset ───────────────────────────────────────────────────────
async function sendPasswordResetEmail({ to, name, token }) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const resetUrl = `${clientUrl}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Reset your ${APP_NAME} password`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:700">Password reset</h2>
        <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
          Hi ${name}, we received a request to reset your ${APP_NAME} password.
          Click below to choose a new one.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#f59e0b;color:#fff;font-weight:600;font-size:15px;
                  padding:12px 28px;border-radius:10px;text-decoration:none">
          Reset password
        </a>
        <p style="margin:24px 0 0;font-size:13px;color:#888">
          This link expires in <strong>30 minutes</strong>.
          If you didn't request a reset, you can safely ignore this email — your password won't change.
        </p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="margin:0;font-size:12px;color:#aaa">
          Or copy this URL into your browser:<br/>
          <span style="color:#555;word-break:break-all">${resetUrl}</span>
        </p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
