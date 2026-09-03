import React, { useState, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { X, Upload, CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';
import { SchedulePayload } from '../types';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SchedulePayload) => Promise<void>;
  userId: string;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSubmit, userId }) => {
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayBetweenMs, setDelayBetweenMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    Papa.parse(file, {
      complete: (results) => {
        const extractedEmails = new Set<string>();
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

        results.data.forEach((row: any) => {
          const rowStr = Array.isArray(row) ? row.join(' ') : JSON.stringify(row);
          const matches = rowStr.match(emailRegex);
          if (matches) {
            matches.forEach((email) => extractedEmails.add(email.toLowerCase()));
          }
        });

        setRecipients(Array.from(extractedEmails));
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recipients.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        userId,
        senderEmail,
        recipients,
        subject,
        body,
        startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        delayBetweenMs,
        hourlyLimit,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Compose & Schedule Email Campaign</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Sender Email</label>
            <input
              type="email"
              required
              placeholder="sender@domain.com"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Upload Lead CSV / Text</label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center space-y-1">
                <Upload className="w-6 h-6 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">
                  {fileName ? fileName : 'Click to upload CSV or text file'}
                </span>
                <span className="text-xs text-gray-400">Auto-detects and extracts all valid email addresses</span>
              </label>
            </div>
            {recipients.length > 0 && (
              <div className="mt-2 flex items-center space-x-2 text-xs text-green-700 bg-green-50 p-2 rounded-md">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Detected <strong>{recipients.length}</strong> unique recipient email(s).</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Subject</label>
            <input
              type="text"
              required
              placeholder="Campaign Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Email Body</label>
            <textarea
              required
              rows={4}
              placeholder="Write your email content..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" /> Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center">
                <Zap className="w-3.5 h-3.5 mr-1" /> Delay (ms)
              </label>
              <input
                type="number"
                min="0"
                value={delayBetweenMs}
                onChange={(e) => setDelayBetweenMs(Number(e.target.value))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Hourly Limit
              </label>
              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || recipients.length === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-lg transition-colors shadow-sm"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
