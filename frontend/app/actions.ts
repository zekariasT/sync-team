'use server'

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';

export async function updatePulse(id: string, formData: FormData) {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const status = formData.get('status') as string;
  if (!status) return;

  // Basic role check:
  // Fetch members to check if the current user is an admin
  try {
    const res = await fetch('http://localhost:3001/members', { cache: 'no-store' });
    const members = await res.json();
    const currentMember = members.find((m: any) => m.id === user.id);
    const isAdmin = currentMember?.teamMembers?.some((tm: any) => tm.role === 'ADMIN');

    if (!isAdmin && user.id !== id) {
      throw new Error('Forbidden: Only admins can update others status');
    }

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
    throw error;
  }
}
