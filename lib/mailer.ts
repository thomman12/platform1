import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT = '587',
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = '"Orbio" <noreply@orbi.org.uk>',
} = process.env;

const portNum = Number(SMTP_PORT);
const secure = portNum === 465; // 465 = SSL; 587 = STARTTLS

export const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: portNum,
  secure,
  auth: { user: SMTP_USER!, pass: SMTP_PASS! },
});

export async function sendOtpEmail(to: string, code: string) {
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
      <h2>Your Orbio verification code</h2>
      <p>Use this code to verify your email:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</div>
      <p>It expires in 10 minutes.</p>
    </div>
  `;
  await mailer.sendMail({
    from: SMTP_FROM,
    to,
    subject: 'Your verification code',
    text: `Your code is: ${code} (valid 10 minutes)`,
    html,
  });
}
