import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext.js';
import { useToast } from './contexts/ToastContext.js';
import { api } from './api/client.js';
import { EmailRecord } from './types/index.js';
import { Header } from './components/layout/Header.js';
import { SlackBanner } from './components/layout/SlackBanner.js';
import { ScheduledTable } from './components/dashboard/ScheduledTable.js';
import { SentTable } from './components/dashboard/SentTable.js';
import { EmailSearch } from './components/dashboard/EmailSearch.js';
import { ComposeModal } from './components/dashboard/ComposeModal.js';
import { Button } from './components/ui/Button.js';
import { Mail, Shield, CheckCircle, Clock, Zap } from 'lucide-react';

export function App() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Handle URL query parameters for OAuth callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      showToast('Successfully authenticated with Google!', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('auth') === 'failure') {
      showToast('Google authentication failed. Please try again.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (params.get('slack') === 'connected') {
      const team = params.get('team') ? ` (${params.get('team')})` : '';
      showToast(`Slack workspace connected successfully!${team}`, 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('slack') === 'error') {
      showToast(`Slack connection failed: ${params.get('message') || 'Unknown error'}`, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [showToast]);

  const fetchScheduled = useCallback(async () => {
    try {
      setLoadingScheduled(true);
      const res = await api.emails.getScheduled();
      setScheduledEmails(res.emails);
    } catch (err: any) {
      console.error('Failed to load scheduled emails', err);
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  const fetchSent = useCallback(async () => {
    try {
      setLoadingSent(true);
      const res = await api.emails.getSent();
      setSentEmails(res.emails);
    } catch (err: any) {
      console.error('Failed to load sent emails', err);
    } finally {
      setLoadingSent(false);
    }
  }, []);

  // Initial fetch and periodic polling for real-time queue execution updates
  useEffect(() => {
    fetchScheduled();
    fetchSent();

    const interval = setInterval(() => {
      fetchScheduled();
      fetchSent();
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchScheduled, fetchSent]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-gray-500">Loading ReachInbox...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show modern Google Login landing view
  if (!user && process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/25 mb-4">
            <Mail className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            ReachInbox Scheduler
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Outbox Labs Software Development Assignment Submission
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-xl border border-gray-100 rounded-3xl sm:px-10 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Persistent BullMQ delayed jobs backed by Redis</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Distributed hourly rate limiting & auto-rescheduling</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Real Slack OAuth & rate limit notification alerts</span>
              </div>
            </div>

            <Button
              onClick={loginWithGoogle}
              size="lg"
              className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
              leftIcon={
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              }
            >
              Sign In with Google
            </Button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-gray-400">
                Requires configured GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onComposeClick={() => setIsComposeOpen(true)}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Slack Connection Banner */}
        <SlackBanner />

        {/* Elasticsearch Search Section */}
        <EmailSearch />

        {/* Tab Content */}
        {activeTab === 'scheduled' ? (
          <ScheduledTable
            emails={scheduledEmails}
            isLoading={loadingScheduled}
            onRefresh={fetchScheduled}
            onComposeClick={() => setIsComposeOpen(true)}
          />
        ) : (
          <SentTable
            emails={sentEmails}
            isLoading={loadingSent}
            onRefresh={fetchSent}
            onComposeClick={() => setIsComposeOpen(true)}
          />
        )}
      </main>

      {/* Compose & Schedule Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onScheduledSuccess={() => {
          fetchScheduled();
          setActiveTab('scheduled');
        }}
      />
    </div>
  );
}
