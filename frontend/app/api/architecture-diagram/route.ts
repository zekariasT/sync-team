import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

// Serves the architecture diagram (docs/syncpoint.drawio at the repo root) to
// the browser so the Technical Overview modal can render it. Keeping docs/ as
// the single source of truth means re-exporting the diagram from draw.io is the
// only step needed to update what the app shows — no copy into public/.
export async function GET() {
  const filePath = path.join(process.cwd(), '..', 'docs', 'syncpoint.drawio');
  try {
    const xml = await readFile(filePath, 'utf8');
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new NextResponse('Architecture diagram not found', { status: 404 });
  }
}
