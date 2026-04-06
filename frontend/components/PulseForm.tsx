'use client';

import { useState } from 'react';
import { updatePulse } from '@/app/actions';
import { useToast } from './ToastProvider';

interface PulseFormProps {
  memberId: string;
}

export default function PulseForm({ memberId }: PulseFormProps) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const { success, error: toastError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status.trim()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('status', status.trim());
      
      const result = await updatePulse(memberId, formData);
      
      if (result?.error) {
        toastError(result.error);
      } else {
        success('Status pulse updated');
        setStatus('');
      }
    } catch (err: any) {
      toastError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2 ml-12">
      <input
        type="text"
        name="status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        placeholder="Set custom status..."
        disabled={loading}
        className="bg-background border border-primary/20 text-text rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:border-secondary placeholder:text-primary/30 transition-colors disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading || !status.trim()}
        className="bg-secondary hover:bg-secondary/80 text-background px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors shrink-0 disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> : 'Pulse'}
      </button>
    </form>
  );
}
