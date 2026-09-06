import React from 'react';
import { EmailStatus } from '../../types/index.js';

interface BadgeProps {
  status: EmailStatus | 'CONNECTED' | 'DISCONNECTED';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const styles: Record<string, string> = {
    SCHEDULED: 'bg-amber-50 text-amber-700 border-amber-200',
    PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
    SENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
    CONNECTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DISCONNECTED: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const labels: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    PROCESSING: 'Sending...',
    SENT: 'Sent',
    FAILED: 'Failed',
    CONNECTED: 'Connected',
    DISCONNECTED: 'Disconnected',
  };

  const dotColors: Record<string, string> = {
    SCHEDULED: 'bg-amber-500',
    PROCESSING: 'bg-blue-500',
    SENT: 'bg-emerald-500',
    FAILED: 'bg-rose-500',
    CONNECTED: 'bg-emerald-500',
    DISCONNECTED: 'bg-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        styles[status] || 'bg-gray-100 text-gray-700 border-gray-200'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status] || 'bg-gray-400'}`} />
      {labels[status] || status}
    </span>
  );
};
