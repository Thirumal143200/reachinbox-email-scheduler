import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { SlackStatus } from '../../types/index.js';
import { Button } from '../ui/Button.js';
import { useToast } from '../../contexts/ToastContext.js';
import { Hash, Unplug, RefreshCw, CheckCircle2 } from 'lucide-react';

export const SlackBanner: React.FC = () => {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const { showToast } = useToast();

  const fetchStatus = async () => {
    try {
      const res = await api.slack.getStatus();
      setStatus(res);
    } catch (err) {
      console.error('Failed to fetch Slack status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = () => {
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    const backendBase = apiUrl
      ? apiUrl.replace(/\/api$/, '')
      : import.meta.env.PROD
      ? 'https://reachinbox-backend-w6uq.onrender.com'
      : '';
    window.location.href = `${backendBase}/api/slack/connect`;
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      await api.slack.disconnect();
      setStatus({ connected: false });
      showToast('Slack workspace disconnected', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to disconnect Slack', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm my-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#4A154B]/10 text-[#4A154B] flex items-center justify-center font-bold text-lg flex-shrink-0">
          #
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900">Slack Alerts & Monitoring</h4>
            {status?.connected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Connected to {status.teamName || 'Workspace'}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
                Not Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {status?.connected
              ? `Real-time alerts will be dispatched to Slack whenever sender rate limits are triggered.`
              : `Connect your Slack workspace to receive automated notifications when rate limits are exceeded.`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        {status?.connected ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnect}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Reconnect
            </Button>
            <Button
              variant="outline"
              size="sm"
              isLoading={disconnecting}
              onClick={handleDisconnect}
              leftIcon={<Unplug className="w-3.5 h-3.5 text-red-500" />}
              className="hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={handleConnect}
            leftIcon={<Hash className="w-3.5 h-3.5" />}
            className="bg-[#4A154B] hover:bg-[#39103a] text-white shadow-sm"
          >
            Connect Slack
          </Button>
        )}
      </div>
    </div>
  );
};
