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
       const err = await response.json();
       return { error: err.message || 'Failed to update status' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update status:', error);
    return { error: error.message || 'An unexpected error occurred' };
  }
}
