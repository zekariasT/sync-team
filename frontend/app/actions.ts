'use server'

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com";

// Helper to get active user ID or fallback to guest for demo purposes
async function getUserId() {
  const user = await currentUser();
  return user?.id || 'guest-demo-user';
}

export async function updatePulse(id: string, formData: FormData) {
  const userId = await getUserId();
  const status = formData.get('status') as string;
  if (!status) return;

  try {
    const response = await fetch(`${API_URL}/members/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
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

export async function updateRole(targetUserId: string, teamId: string, role: string) {
  const userId = await getUserId();

  try {
    const response = await fetch(`${API_URL}/teams/${teamId}/members/${targetUserId}/role`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { error: err.message || 'Failed to update role' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update role:', error);
    return { error: error.message || 'An unexpected error occurred' };
  }
}
export async function addMember(teamId: string, email: string) {
  const userId = await getUserId();

  try {
    const response = await fetch(`${API_URL}/teams/${teamId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { error: err.message || 'Failed to add member' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' };
  }
}

export async function removeMember(teamId: string, targetUserId: string) {
  const userId = await getUserId();

  try {
    const response = await fetch(`${API_URL}/teams/${teamId}/members/${targetUserId}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': userId,
      },
    });

    if (!response.ok) {
      const err = await response.json();
      return { error: err.message || 'Failed to remove member' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' };
  }
}

export async function deleteUserSystem(targetUserId: string) {
  const userId = await getUserId();

  try {
    const response = await fetch(`${API_URL}/members/${targetUserId}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': userId,
      },
    });

    if (!response.ok) {
      const err = await response.json();
      return { error: err.message || 'Failed to delete user' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' };
  }
}
