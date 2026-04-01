'use server'

import { revalidatePath } from 'next/cache';

export async function updatePulse(id: string, formData: FormData) {
  const status = formData.get('status') as string;

  if (!status) return;

  try {
    await fetch(`http://localhost:3001/members/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    revalidatePath('/');
  } catch (error) {
    console.error('Failed to update status:', error);
  }
}
