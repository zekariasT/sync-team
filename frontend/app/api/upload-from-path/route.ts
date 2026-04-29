import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(req: NextRequest) {
  // Safety: only allow in local/dev environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Local file upload not available in production' }, { status: 403 });
  }

  const { filePath, teamId, uploaderId, editingDocId } = await req.json();

  if (!filePath || typeof filePath !== 'string') {
    return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
  }

  // Validate extension
  const allowedExtensions = ['.pdf', '.txt', '.md', '.csv'];
  const ext = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return NextResponse.json({ error: `Unsupported file type: ${ext}` }, { status: 400 });
  }

  // Read file from disk
  let buffer: Buffer;
  try {
    const resolvedPath = filePath.startsWith('file://') ? decodeURIComponent(filePath.replace('file://', '')) : filePath;
    buffer = fs.readFileSync(resolvedPath);
  } catch (e: any) {
    return NextResponse.json({ error: `Could not read file: ${e.message}` }, { status: 400 });
  }

  // Forward to NestJS backend
  const fileName = path.basename(filePath);
  const mimeType = ext === '.pdf' ? 'application/pdf' : 'text/plain';
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });

  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('uploaderId', uploaderId || 'guest-demo-user');

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://syncpoint-backend.onrender.com';
  const url = editingDocId
    ? `${baseUrl}/teams/${teamId}/kb/documents/${editingDocId}`
    : `${baseUrl}/teams/${teamId}/kb/documents`;

  const authHeader = req.headers.get('authorization') || '';

  const backendRes = await fetch(url, {
    method: editingDocId ? 'PATCH' : 'POST',
    headers: {
      'x-user-id': uploaderId || 'guest-demo-user',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: formData,
  });

  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendRes.status });
}
