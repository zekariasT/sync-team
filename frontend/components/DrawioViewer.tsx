'use client';

import { useEffect, useState } from 'react';

// Build a self-contained HTML document that loads the official draw.io static
// viewer and renders the diagram. Running this inside an <iframe srcDoc> means
// the viewer script's own init runs in its own document — no races with React's
// lifecycle, and the heavy (~4MB) script is isolated from the main app.
//
// The viewer fits the diagram to the iframe *width*, so the rendered height is
// stable; we measure it and postMessage it out so the parent can size the
// iframe (and therefore the modal) snugly around the diagram.
function buildSrcDoc(xml: string): string {
  // Embed the XML as JSON in a <script> block. JSON.stringify handles all
  // quoting; escaping "</" prevents a stray "</script>" from closing the block.
  const jsonXml = JSON.stringify(xml).replace(/<\//g, '<\\/');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<base target="_blank">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  .mxgraph { max-width: 100%; }
</style>
</head>
<body>
<div id="graph"></div>
<script id="diagram-xml" type="application/json">${jsonXml}</script>
<script src="https://viewer.diagrams.net/js/viewer-static.min.js"></script>
<script>
(function () {
  var xml = JSON.parse(document.getElementById('diagram-xml').textContent);
  var el = document.getElementById('graph');
  el.className = 'mxgraph';
  el.setAttribute('data-mxgraph', JSON.stringify({
    highlight: '#00b894', nav: true, resize: true,
    toolbar: 'zoom layers', xml: xml
  }));

  function reportHeight() {
    var h = Math.ceil(document.body.scrollHeight);
    if (h > 0) parent.postMessage({ type: 'drawio-viewer-height', height: h }, '*');
  }

  // The viewer global may not be ready the instant this runs — poll briefly.
  (function render(tries) {
    if (window.GraphViewer) {
      window.GraphViewer.processElements();
      // Layout settles a tick after processing; measure a few times + observe.
      setTimeout(reportHeight, 60);
      setTimeout(reportHeight, 300);
      setTimeout(reportHeight, 700);
      if (window.ResizeObserver) new ResizeObserver(reportHeight).observe(document.body);
    } else if (tries < 100) {
      setTimeout(function () { render(tries + 1); }, 50);
    }
  })(0);
})();
</script>
</body>
</html>`;
}

export default function DrawioViewer() {
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(360);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/architecture-diagram', { cache: 'no-store' });
        if (!res.ok) throw new Error('not ok');
        const xml = await res.text();
        if (!cancelled) setSrcDoc(buildSrcDoc(xml));
      } catch {
        if (!cancelled) setError('Could not load the architecture diagram.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e?.data?.type === 'drawio-viewer-height' && typeof e.data.height === 'number') {
        const max = Math.round(window.innerHeight * 0.78);
        setHeight(Math.min(Math.max(e.data.height, 160), max));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (error) {
    return (
      <div className="text-center text-sm text-primary/50 py-12">
        {error}{' '}
        <a href="/api/architecture-diagram" className="text-secondary underline" download="syncpoint.drawio">
          Download the .drawio
        </a>
      </div>
    );
  }

  if (!srcDoc) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-secondary rounded-full animate-spin" />
        <p className="text-xs text-primary/40 font-mono">LOADING DIAGRAM...</p>
      </div>
    );
  }

  return (
    <iframe
      title="SyncPoint OS architecture"
      srcDoc={srcDoc}
      style={{ height }}
      className="w-full border-0 bg-transparent transition-[height] duration-200"
    />
  );
}
