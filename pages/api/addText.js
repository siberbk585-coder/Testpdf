import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Tăng giới hạn body JSON (mặc định Next.js là 1MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// Helper: tải PDF từ URL (Node 18+ có fetch)
async function fetchPdfBytesFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Tải PDF thất bại: ${res.status} ${res.statusText}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

// Helper: chuẩn hoá base64 (loại bỏ data URL prefix nếu có)
function normalizeBase64(b64) {
  if (typeof b64 !== 'string') return '';
  return b64.replace(/^data:application\/pdf;base64,?/i, '').trim();
}

export default async function handler(req, res) {
  // CORS đơn giản (nếu cần gọi từ domain khác)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
  }

  try {
    const {
      pdfBase64,
      pdfUrl,         // tuỳ chọn: server tự tải PDF
      text,
      x,
      y,
      pageNumber,     // -1 để chọn trang cuối
      fontSize,       // tuỳ chọn
    } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: 'Thiếu nội dung chữ.' });
    }

    // Lấy bytes của PDF: ưu tiên pdfBase64, nếu không có thì pdfUrl
    let pdfBytes;
    if (pdfBase64 && typeof pdfBase64 === 'string') {
      const cleanB64 = normalizeBase64(pdfBase64);
      if (!cleanB64) return res.status(400).json({ error: 'Dữ liệu PDF base64 không hợp lệ.' });
      pdfBytes = Buffer.from(cleanB64, 'base64');
    } else if (pdfUrl && typeof pdfUrl === 'string') {
      pdfBytes = await fetchPdfBytesFromUrl(pdfUrl);
    } else {
      return res.status(400).json({ error: 'Thiếu pdfBase64 hoặc pdfUrl.' });
    }

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Chọn trang
    const pages = pdfDoc.getPages();
    const idx =
      Number.isInteger(pageNumber)
        ? (pageNumber === -1 ? pages.length - 1 : Math.max(0, Math.min(pageNumber, pages.length - 1)))
        : 0;
    const targetPage = pages[idx];

    // Font & vẽ chữ
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const size = typeof fontSize === 'number' && fontSize > 0 ? fontSize : 12;

    // Toạ độ mặc định: gần góc trái phía dưới
    const posX = typeof x === 'number' ? x : 50;
    const posY = typeof y === 'number' ? y : 50;

    targetPage.drawText(String(text), {
      x: posX,
      y: posY,
      size,
      font,
      color: rgb(0, 0, 0),
    });

    // Xuất lại PDF -> base64
    const modifiedBytes = await pdfDoc.save();
    const modifiedBase64 = Buffer.from(modifiedBytes).toString('base64');

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      pdfBase64: modifiedBase64,
      pageUsed: idx,
    });
  } catch (err) {
    console.error('Error processing PDF:', err);
    return res.status(500).json({ error: 'Không thể xử lý PDF.' });
  }
}
