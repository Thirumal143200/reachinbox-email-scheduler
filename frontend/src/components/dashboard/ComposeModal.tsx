import React, { useState } from 'react';
import { Modal } from '../ui/Modal.js';
import { Input } from '../ui/Input.js';
import { Textarea } from '../ui/Textarea.js';
import { Button } from '../ui/Button.js';
import { FileUpload } from '../ui/FileUpload.js';
import { api } from '../../api/client.js';
import { useToast } from '../../contexts/ToastContext.js';
import { Send, Clock, ShieldAlert } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduledSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onScheduledSuccess }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // default 1 minute from now
    return now.toISOString().slice(0, 16);
  });
  const [delaySec, setDelaySec] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [senderEmail, setSenderEmail] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [directRecipientsInput, setDirectRecipientsInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  const handleRecipientsParsed = (emails: string[]) => {
    setRecipients(emails);
    if (emails.length > 0) {
      setErrors((prev) => ({ ...prev, recipients: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Combine uploaded emails and manual textarea input
    const manualEmails = directRecipientsInput
      .split(/[\r\n,;\t]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    const allRecipients = Array.from(new Set([...recipients, ...manualEmails]));

    if (allRecipients.length === 0) {
      newErrors.recipients = 'Please provide at least one valid recipient via upload or text.';
    }

    if (!subject.trim()) {
      newErrors.subject = 'Subject line is required.';
    }

    if (!body.trim()) {
      newErrors.body = 'Email content body is required.';
    }

    if (delaySec < 0) {
      newErrors.delay = 'Delay must be 0 or greater.';
    }

    if (hourlyLimit <= 0) {
      newErrors.hourlyLimit = 'Hourly limit must be greater than 0.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Combine uploaded & manual
    const manualEmails = directRecipientsInput
      .split(/[\r\n,;\t]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    const finalRecipients = Array.from(new Set([...recipients, ...manualEmails]));

    setIsLoading(true);
    try {
      const payload = {
        recipients: finalRecipients,
        subject: subject.trim(),
        body: body.trim(),
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmailsMs: delaySec * 1000,
        hourlyLimit,
        senderEmail: senderEmail.trim() || undefined,
      };

      const res = await api.emails.schedule(payload);
      showToast(`Successfully scheduled ${res.count} emails!`, 'success');
      onScheduledSuccess();
      onClose();

      // Reset form
      setSubject('');
      setBody('');
      setRecipients([]);
      setDirectRecipientsInput('');
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule emails', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose & Schedule Campaign"
      subtitle="Schedule delayed emails with distributed rate limiting"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Recipient Upload */}
        <FileUpload onEmailsParsed={handleRecipientsParsed} parsedEmails={recipients} />

        {/* Manual Recipient Fallback Textarea */}
        <Textarea
          label="Or Enter Email Addresses Manually"
          placeholder="colleague@example.com, partner@company.com (comma or newline separated)"
          value={directRecipientsInput}
          onChange={(e) => setDirectRecipientsInput(e.target.value)}
          error={errors.recipients}
          className="min-h-[80px]"
        />

        {/* Subject */}
        <Input
          label="Subject Line"
          placeholder="Product Demo & Introduction"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          error={errors.subject}
        />

        {/* Email Body */}
        <Textarea
          label="Email Body (HTML or Plaintext)"
          placeholder="Hi there,<br><br>We are excited to share our latest updates..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          error={errors.body}
          className="min-h-[140px]"
        />

        {/* Timing & Delay Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50/80 border border-gray-100">
          <Input
            type="datetime-local"
            label="Start Execution Time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            helperText="When sending begins"
          />

          <Input
            type="number"
            min={0}
            step={1}
            label="Delay Between Sends (sec)"
            value={delaySec}
            onChange={(e) => setDelaySec(parseInt(e.target.value, 10) || 0)}
            error={errors.delay}
            helperText="Worker interval delay"
          />

          <Input
            type="number"
            min={1}
            step={1}
            label="Hourly Rate Limit"
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 100)}
            error={errors.hourlyLimit}
            helperText="Max emails per hour"
          />
        </div>

        {/* Optional Custom Sender */}
        <Input
          label="Sender Email (Optional)"
          placeholder="marketing@reachinbox.ai (defaults to verified Ethereal sender)"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          helperText="Unique sender identity for isolated rate limit windows"
        />

        {/* Notice */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 leading-relaxed">
          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p>
            Emails will be saved to PostgreSQL first, then scheduled as persistent delayed jobs in BullMQ. If the hourly limit is exceeded, jobs are automatically rescheduled to the next hour window and an alert is sent to Slack.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Send className="w-4 h-4" />}
            className="shadow-sm"
          >
            Schedule Emails
          </Button>
        </div>
      </form>
    </Modal>
  );
};
