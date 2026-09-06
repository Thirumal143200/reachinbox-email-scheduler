import React, { useState } from 'react';
import { EmailRecord } from '../../types/index.js';
import { Badge } from '../ui/Badge.js';
import { EmptyState } from '../ui/EmptyState.js';
import { LoadingState } from '../ui/LoadingState.js';
import { Search, RefreshCw, Send, Mail, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SentTableProps {
  emails: EmailRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onComposeClick: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  emails,
  isLoading,
  onRefresh,
  onComposeClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = emails.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.recipient.toLowerCase().includes(term) ||
      item.subject.toLowerCase().includes(term) ||
      (item.error && item.error.toLowerCase().includes(term))
    );
  });

  const formatSentTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Refresh Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter sent emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onRefresh}
            title="Refresh"
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-medium transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Send}
          title={searchTerm ? 'No matching sent emails' : 'No emails sent yet'}
          description={
            searchTerm
              ? 'Try modifying your search filter.'
              : 'Dispatched emails from workers will automatically display here along with Ethereal preview links.'
          }
          actionLabel={searchTerm ? undefined : 'Compose an Email'}
          onAction={searchTerm ? undefined : onComposeClick}
        />
      ) : (
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Recipient Email</th>
                  <th className="py-3.5 px-6">Subject</th>
                  <th className="py-3.5 px-6">Sent Time</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Ethereal Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filtered.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                            email.status === 'SENT'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {email.status === 'SENT' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="truncate max-w-[220px]">{email.recipient}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-gray-700">
                      <span className="truncate max-w-[280px] block font-medium">{email.subject}</span>
                      {email.error && (
                        <span className="text-[11px] text-rose-600 truncate block mt-0.5">{email.error}</span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                      {formatSentTime(email.sentAt)}
                    </td>

                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <Badge status={email.status} />
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {email.etherealPreviewUrl ? (
                        <a
                          href={email.etherealPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors border border-blue-200/60 shadow-xs"
                        >
                          <span>View Preview</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 flex items-center justify-between">
            <span>Showing {filtered.length} sent record{filtered.length !== 1 ? 's' : ''}</span>
            <span className="text-[11px] text-gray-400">Recorded idempotently in PostgreSQL</span>
          </div>
        </div>
      )}
    </div>
  );
};
