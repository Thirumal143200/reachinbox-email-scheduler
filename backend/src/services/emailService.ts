import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let transporter: Transporter | null = null;

export function getEmailTransporter(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return transporter;
}

export interface SendEmailOptions {
  from?: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  etherealPreviewUrl?: string | null;
  error?: string;
}

export const emailService = {
  /**
   * Sends an email via configured SMTP (Ethereal) and extracts the preview URL
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const transport = getEmailTransporter();

    try {
      const info = await transport.sendMail({
        from: options.from || `"${config.smtp.fromName}" <${config.smtp.fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.body,
        text: options.body.replace(/<[^>]*>?/gm, ''), // Plaintext fallback
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || null;

      logger.info({ messageId: info.messageId, to: options.to, previewUrl }, 'Email dispatched via SMTP');

      return {
        success: true,
        messageId: info.messageId,
        etherealPreviewUrl: previewUrl ? previewUrl.toString() : null,
      };
    } catch (error: any) {
      logger.error({ error: error.message, to: options.to }, 'Failed to dispatch email via SMTP');
      return {
        success: false,
        error: error.message || 'Unknown SMTP error',
      };
    }
  },
};
