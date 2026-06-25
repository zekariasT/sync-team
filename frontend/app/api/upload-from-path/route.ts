import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

  // Confine reads to an allowlisted root so this endpoint can't be coerced into
  // reading sensitive files elsewhere on the host (e.g. /etc/passwd, other homes).
  // Set LOCAL_UPLOAD_ROOT to narrow it further (e.g. a dedicated docs folder).
  const allowedRoot = path.resolve(process.env.LOCAL_UPLOAD_ROOT || os.homedir());

  let buffer: Buffer;
  try {
    const requested = filePath.startsWith('file://')
      ? decodeURIComponent(filePath.replace('file://', ''))
      : filePath;
    // realpathSync resolves symlinks and `..`, defeating traversal/symlink escapes.
    const realPath = fs.realpathSync(path.resolve(requested));
    if (realPath !== allowedRoot && !realPath.startsWith(allowedRoot + path.sep)) {
      return NextResponse.json({ error: 'Access to this path is not allowed' }, { status: 403 });
    }
    if (!fs.statSync(realPath).isFile()) {
      return NextResponse.json({ error: 'Path is not a file' }, { status: 400 });
    }
    buffer = fs.readFileSync(realPath);
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
