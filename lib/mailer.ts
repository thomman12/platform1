import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

export async function sendMail(to: string, subject: string, html: string) {
  // Dev fallback: no SMTP -> log to server
  if (!SMTP_HOST) {
    console.log(`[DEV MAIL] to=${to} subject=${subject}\n${html}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: false,
    auth: { user: SMTP_USER!, pass: SMTP_PASS! },
  });

  await transporter.sendMail({ from: SMTP_FROM!, to, subject, html });
}

export async function sendOtp(to: string, code: string) {
  await sendMail(
    to,
    'Your verification code',
    `<p>Your verification code is</p>
     <p style="font-size:24px;font-weight:700;letter-spacing:6px">${code}</p>
     <p>This code expires in 10 minutes.</p>`
  );
}
