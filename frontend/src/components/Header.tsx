import React from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { LogOut, User as UserIcon, Mail } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile | null;
  onLoginSuccess: (credentialResponse: any) => void;
  onLogout: () => void;
  isSlackConnected: boolean;
  onConnectSlack: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLoginSuccess,
  onLogout,
  isSlackConnected,
  onConnectSlack,
}) => {
  return (
    <header className="w-full bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-600 rounded-lg text-white">
          <Mail className="w-5 h-5" />
        </div>
        <span className="font-bold text-xl text-gray-900 tracking-tight">ReachInbox Scheduler</span>
      </div>

      <div className="flex items-center space-x-4">
        {user ? (
          <>
            <button
              onClick={onConnectSlack}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                isSlackConnected
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              {isSlackConnected ? '✓ Slack Connected' : 'Connect Slack'}
            </button>

            <div className="flex items-center space-x-3 border-l pl-4 border-gray-200">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full ring-2 ring-blue-500/20" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-gray-800 leading-none">{user.name}</span>
                <span className="text-xs text-gray-500 mt-1">{user.email}</span>
              </div>
              <button
                onClick={() => {
                  googleLogout();
                  onLogout();
                }}
                className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <GoogleLogin
            onSuccess={onLoginSuccess}
            onError={() => console.error('Google Login Failed')}
            useOneTap
          />
        )}
      </div>
    </header>
  );
};
