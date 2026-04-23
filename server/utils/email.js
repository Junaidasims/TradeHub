const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Mock service: In development, just log to console
  if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
    console.log('\n------------------------------------------');
    console.log('📧 MOCK EMAIL SENT');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message:\n${options.text}`);
    if (options.html) {
      console.log(`HTML Content: ${options.html}`);
    }
    console.log('------------------------------------------\n');
    return { success: true, mock: true };
  }

  // Real SMTP setup (for later)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `TradeHub <${process.env.FROM_EMAIL || 'noreply@tradehub.com'}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
