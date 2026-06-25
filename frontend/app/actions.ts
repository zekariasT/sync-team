'use server'

import { revalidatePath } from 'next/cache';
import { currentUser, auth } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com";

// Real auth is enforced on the backend: the guard only trusts the identity it
// verifies from a Clerk session token, so every call MUST carry a Bearer token.
// x-user-id is kept for logging/compat but is no longer trusted for authz.
async function authHeaders(): Promise<Record<string, string>> {
  const user = await currentUser();
  const { getToken } = await auth();
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    'x-user-id': user?.id ?? '',
    'Authorization': `Bearer ${token}`,
  };
}

export async function updatePulse(id: string, formData: FormData) {
  const status = formData.get('status') as string;
  if (!status) return;

  try {
    const response = await fetch(`${API_URL}/members/${id}`, {
      method: 'PATCH',
      headers: await authHeaders(),
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
  try {
    const response = await fetch(`${API_URL}/teams/${teamId}/members/${targetUserId}/role`, {
      method: 'POST',
      headers: await authHeaders(),
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
  try {
    const response = await fetch(`${API_URL}/teams/${teamId}/members`, {
      method: 'POST',
      headers: await authHeaders(),
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
  try {
    const response = await fetch(`${API_URL}/teams/${teamId}/members/${targetUserId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
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
  try {
    const response = await fetch(`${API_URL}/members/${targetUserId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
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
