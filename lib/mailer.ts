// lib/mailer.ts — HTTP mailer for student OTP only

const API_KEY = process.env.BREVO_API_KEY!;
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL || 'noreply@orbi.org.uk';
const FROM_NAME  = process.env.MAIL_FROM_NAME  || 'Orbio';

function otpHtml(code: string) {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
      <h2>Hi,Your Orbio verification code </h2>
      <p>Use this code to verify your email:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">
        ${code}
      </div>
      <p>Enter it on the Orbio page to finish sign-up.</p>
      <p>This code expires in 10 minutes.</p>
      <p>If you didn’t request this, you can ignore this email.</p>
    </div>
  `;
}

export async function sendOtpEmail(to: string, code: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY,
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject: 'Your verification code',
      htmlContent: otpHtml(code),
      textContent: `Your verification code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brevo API failed (${res.status}): ${text || res.statusText}`);
  }
}
