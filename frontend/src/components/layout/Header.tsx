import React from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { Button } from '../ui/Button.js';
import { Plus, LogOut, Mail, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onComposeClick: () => void;
  scheduledCount?: number;
  sentCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onComposeClick,
  scheduledCount = 0,
  sentCount = 0,
}) => {
  const { user, logout, loginWithGoogle } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar: Brand & User Profile */}
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                ReachInbox <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/50">Scheduler</span>
              </span>
            </div>
          </div>

          {/* Right actions: BullMQ Link, User Profile, Compose */}
          <div className="flex items-center gap-3">
            <a
              href={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, "") : import.meta.env.PROD ? "https://reachinbox-backend-w6uq.onrender.com" : ""}/admin/queues`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>BullMQ Queue UI</span>
            </a>

            <Button
              onClick={onComposeClick}
              leftIcon={<Plus className="w-4 h-4" />}
              className="shadow-sm hover:shadow"
            >
              Compose New Email
            </Button>

            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="flex items-center gap-2.5">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center border border-blue-200">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-gray-900 leading-none">{user.name}</p>
                    <p className="text-[11px] text-gray-500 truncate max-w-[140px] leading-tight mt-0.5">{user.email}</p>
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Logout"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={loginWithGoogle}>
                Sign In with Google
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs matching Figma layout */}
        <div className="flex items-center gap-8 -mb-px">
          <button
            onClick={() => onTabChange('scheduled')}
            className={`flex items-center gap-2 py-3.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'scheduled'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <span>Scheduled Emails</span>
            {scheduledCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 font-medium">
                {scheduledCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('sent')}
            className={`flex items-center gap-2 py-3.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'sent'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <span>Sent Emails</span>
            {sentCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 font-medium">
                {sentCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
