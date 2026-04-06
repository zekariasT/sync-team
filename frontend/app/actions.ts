'use server'

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';

export async function updatePulse(id: string, formData: FormData) {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const status = formData.get('status') as string;
  if (!status) return;

  try {
    // Redundant role check removed - backend handles this securely.
    const response = await fetch(`http://localhost:3001/members/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
       const err = await response.text();
       throw new Error(err || 'Failed to update status');
    }

    revalidatePath('/');
  } catch (error) {
    console.error('Failed to update status:', error);
    throw error;
  }
}
