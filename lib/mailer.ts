import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,                   // e.g. smtp-relay.brevo.com
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
});

export async function sendStudentOtpEmail(to: string, code: string) {
  const from = process.env.SMTP_FROM || 'noreply@orbi.org.uk';
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px">
      <h2>Verify your email</h2>
      <p>Use this 6-digit code to finish signing up:</p>
      <div style="font-size:28px;letter-spacing:8px;font-weight:700;padding:12px 0">${code}</div>
      <p style="color:#666">This code expires in 10 minutes.</p>
    </div>
  `;
  await transporter.sendMail({ from, to, subject: 'Your verification code', html, text: `Code: ${code}` });
}
