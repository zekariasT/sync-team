'use client';

import { useState } from 'react';
import { updatePulse } from '@/app/actions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PulseFormProps {
  memberId: string;
}

export default function PulseForm({ memberId }: PulseFormProps) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status.trim()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('status', status.trim());

      const result = await updatePulse(memberId, formData);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Status pulse updated');
        setStatus('');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="text"
        name="status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        placeholder="Set custom status…"
        disabled={loading}
        aria-label="Set custom status"
        className="h-9 bg-surface-2"
      />
      <Button type="submit" disabled={loading || !status.trim()} className="h-9 shrink-0">
        {loading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
        Set
      </Button>
    </form>
  );
}
