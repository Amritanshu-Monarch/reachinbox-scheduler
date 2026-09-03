import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Plus, Search } from 'lucide-react';
import { Header } from '../components/Header';
import { EmailTable } from '../components/EmailTable';
import { ComposeModal } from '../components/ComposeModal';
import { EmailJob, UserProfile, SchedulePayload } from '../types';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSlackConnected, setIsSlackConnected] = useState(false);

  const fetchEmails = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (searchQuery) {
        const res = await axios.get(`http://localhost:4000/api/emails/search?q=${searchQuery}&userId=${user.id}`);
        setJobs(res.data);
      } else {
        const res = await axios.get(`http://localhost:4000/api/emails?userId=${user.id}&status=${activeTab}`);
        setJobs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [user, activeTab, searchQuery]);

  const handleLoginSuccess = (credentialResponse: any) => {
    // Decoding JWT payload
    const base64Url = credentialResponse.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    setUser({
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      avatar: payload.picture,
    });
  };

  const handleScheduleSubmit = async (payload: SchedulePayload) => {
    await axios.post('http://localhost:4000/api/emails/schedule', payload);
    fetchEmails();
  };

  const handleConnectSlack = () => {
    // Direct user to backend Slack OAuth endpoint
    window.location.href = `http://localhost:4000/api/auth/slack?userId=${user?.id}`;
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Header
          user={user}
          onLoginSuccess={handleLoginSuccess}
          onLogout={() => setUser(null)}
          isSlackConnected={isSlackConnected}
          onConnectSlack={handleConnectSlack}
        />

        {user ? (
          <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex space-x-1 bg-gray-200/80 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('scheduled')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'scheduled'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Scheduled Emails
                </button>
                <button
                  onClick={() => setActiveTab('sent')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'sent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sent Emails
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Elasticsearch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Compose New Email</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <EmailTable jobs={jobs} loading={loading} type={activeTab} />
            </div>

            <ComposeModal
              isOpen={isComposeOpen}
              onClose={() => setIsComposeOpen(false)}
              onSubmit={handleScheduleSubmit}
              userId={user.id}
            />
          </main>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Welcome to ReachInbox Scheduler</h1>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              Please sign in with your Google account to manage, schedule, and send your cold email campaigns.
            </p>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
