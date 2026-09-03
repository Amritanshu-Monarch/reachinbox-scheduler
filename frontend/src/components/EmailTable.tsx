import React from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, Mail } from 'lucide-react';
import { EmailJob } from '../types';

interface EmailTableProps {
  jobs: EmailJob[];
  loading: boolean;
  type: 'scheduled' | 'sent';
}

export const EmailTable: React.FC<EmailTableProps> = ({ jobs, loading, type }) => {
  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse w-full" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
          <Mail className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">No {type} emails found</h3>
        <p className="text-xs text-gray-500 mt-1">
          {type === 'scheduled'
            ? 'Compose a campaign to add emails to the queue.'
            : 'Emails will appear here once delivered.'}
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: EmailJob['status']) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" /> Sent
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" /> Scheduled
          </span>
        );
      case 'DELAYED_RATE_LIMIT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" /> Delayed (Rate Limit)
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" /> Failed
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <th className="py-3 px-6">Recipient</th>
            <th className="py-3 px-6">Subject</th>
            <th className="py-3 px-6">Sender</th>
            <th className="py-3 px-6">{type === 'scheduled' ? 'Scheduled Time' : 'Sent Time'}</th>
            <th className="py-3 px-6">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-gray-50/80 transition-colors">
              <td className="py-3.5 px-6 font-medium text-gray-900">{job.recipient}</td>
              <td className="py-3.5 px-6">{job.subject}</td>
              <td className="py-3.5 px-6 text-gray-500 text-xs">{job.senderEmail}</td>
              <td className="py-3.5 px-6 text-xs text-gray-500">
                {type === 'scheduled'
                  ? new Date(job.scheduledAt).toLocaleString()
                  : job.sentAt
                  ? new Date(job.sentAt).toLocaleString()
                  : '—'}
              </td>
              <td className="py-3.5 px-6">{getStatusBadge(job.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
