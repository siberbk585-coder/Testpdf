import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } }, // body rất nhỏ vì chỉ là JSON nhẹ
};

// tải PDF từ URL (Node 18+ có fetch)
async function fetchPdfBytes(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch PDF failed: ${r.status} ${r.statusText}`);
  const ab = await r.arrayBuffer();
  return new Uint8Array(ab);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Only POST' });
  }

  try {
    const { pdfUrl, text, x, y, pageNumber = -1, fontSize = 12 } = req.body || {};
    if (!pdfUrl) return res.status(400).json({ error: 'Missing pdfUrl' });
    if (!text) return res.status(400).json({ error: 'Missing text' });

    const pdfBytes = await fetchPdfBytes(pdfUrl);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const idx = pageNumber === -1
      ? pages.length - 1
      : Math.max(0, Math.min(Number(pageNumber) || 0, pages.length - 1));
    const page = pages[idx];

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(String(text), {
      x: typeof x === 'number' ? x : 50,
      y: typeof y === 'number' ? y : 50,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    const out = await pdfDoc.save();
    // trả JSON base64 (giữ nguyên cách bạn đang dùng)
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ pdfBase64: Buffer.from(out).toString('base64'), pageUsed: idx });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'PDF processing failed' });
  }
}
