import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * API route handler that accepts a JSON body containing a base64
 * encoded PDF and text information, overlays the text onto the
 * specified page and coordinates, and returns a new base64 encoded
 * PDF.  When deployed on Vercel, this file becomes a serverless
 * function automatically.
 *
 * Body shape:
 *   {
 *     pdfBase64: string, // base64 encoded PDF file
 *     text: string,      // text to overlay
 *     x: number,         // horizontal coordinate
 *     y: number,         // vertical coordinate
 *     pageNumber: number // zero‑based page index
 *   }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
  }
  try {
    const { pdfBase64, text, x, y, pageNumber } = req.body;
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return res.status(400).json({ error: 'Thiếu dữ liệu file PDF.' });
    }
    if (!text) {
      return res.status(400).json({ error: 'Thiếu nội dung chữ.' });
    }
    const pageIdx = Number.isInteger(pageNumber) && pageNumber >= 0 ? pageNumber : 0;
    // Decode the base64 PDF into a Uint8Array
    const binaryString = Buffer.from(pdfBase64, 'base64');
    // Load the existing PDF
    const pdfDoc = await PDFDocument.load(binaryString);
    // Ensure the page exists
    const pages = pdfDoc.getPages();
    const targetPage = pages[Math.min(pageIdx, pages.length - 1)];
    // Embed a standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    // Draw the text onto the page
    const fontSize = 12;
    targetPage.drawText(text, {
      x: typeof x === 'number' ? x : 50,
      y: typeof y === 'number' ? y : 750,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });
    // Serialize the PDF back to bytes
    const modifiedBytes = await pdfDoc.save();
    const modifiedBase64 = Buffer.from(modifiedBytes).toString('base64');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ pdfBase64: modifiedBase64 });
  } catch (err) {
    console.error('Error processing PDF:', err);
    return res.status(500).json({ error: 'Không thể xử lý PDF.' });
  }
}