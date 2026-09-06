import nodemailer from 'nodemailer';

async function main() {
  console.log('--- Generating new Ethereal Email test account ---');
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('\nSuccess! Ethereal Email account created:');
    console.log(`SMTP_HOST=${testAccount.smtp.host}`);
    console.log(`SMTP_PORT=${testAccount.smtp.port}`);
    console.log(`SMTP_USER=${testAccount.user}`);
    console.log(`SMTP_PASS=${testAccount.pass}`);
    console.log('\nCopy these 4 lines into your .env file.');
  } catch (err) {
    console.error('Failed to create Ethereal test account:', err);
  }
}

main();
