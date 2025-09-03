import { useState } from 'react';

/**
 * The home page renders a simple interface to upload a PDF, specify
 * overlay text and its position, then send the data to the API.  When
 * the server responds with the modified PDF, the page creates a
 * download link for the user.  This component is intentionally
 * straightforward so that non‑developers can follow the code and
 * behaviour easily.
 */
export default function Home() {
  // Local state for the selected file, text and coordinates.
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [x, setX] = useState(50);
  const [y, setY] = useState(750);
  const [pageNumber, setPageNumber] = useState(1);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Convert an ArrayBuffer to a base64 string.  Vercel functions
   * receive and return data encoded as base64.  This helper is
   * abstracted to simplify the upload handler below.
   *
   * @param {ArrayBuffer} buffer
   * @returns {string}
   */
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Handle form submission by reading the selected PDF, encoding it
   * to base64 and sending it to the API route.  The API returns a
   * new base64 string representing the modified PDF.  When the
   * response arrives we create a Blob and generate a temporary URL
   * for download.
   *
   * @param {React.FormEvent} event
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setDownloadUrl(null);
    if (!file) {
      setError('Vui lòng chọn file PDF trước.');
      return;
    }
    if (!text) {
      setError('Vui lòng nhập nội dung chữ cần gắn.');
      return;
    }
    setLoading(true);
    try {
      // Read the PDF file into an ArrayBuffer
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async () => {
        const arrayBuffer = reader.result;
        const pdfBase64 = arrayBufferToBase64(arrayBuffer);
        // Send request to the API
        const response = await fetch('/api/addText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdfBase64,
            text,
            x: parseFloat(x),
            y: parseFloat(y),
            pageNumber: parseInt(pageNumber, 10) - 1, // zero‑based index on server
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Xử lý file thất bại.');
        } else {
          const data = await response.json();
          const modifiedPdfBase64 = data.pdfBase64;
          // Convert base64 to Blob for download
          const binaryString = atob(modifiedPdfBase64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
        }
        setLoading(false);
      };
      reader.onerror = (err) => {
        setLoading(false);
        setError('Không thể đọc file PDF.');
      };
    } catch (err) {
      setLoading(false);
      setError('Đã xảy ra lỗi khi gửi dữ liệu.');
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ textAlign: 'center' }}>Thêm chữ vào PDF</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Chọn file PDF:
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>
        <label>
          Nội dung chữ:
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập nội dung..."
          />
        </label>
        <label>
          Trang (bắt đầu từ 1):
          <input
            type="number"
            min="1"
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
          />
        </label>
        <label>
          Toạ độ X:
          <input
            type="number"
            value={x}
            onChange={(e) => setX(e.target.value)}
          />
        </label>
        <label>
          Toạ độ Y:
          <input
            type="number"
            value={y}
            onChange={(e) => setY(e.target.value)}
          />
        </label>
        {loading ? (
          <button type="button" disabled>
            Đang xử lý...
          </button>
        ) : (
          <button type="submit">Gửi và Tải về PDF mới</button>
        )}
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {downloadUrl && (
        <p>
          Tệp đã sẵn sàng: <a href={downloadUrl} download="modified.pdf">Tải PDF đã chỉnh sửa</a>
        </p>
      )}
      <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        Lưu ý: Trong PDF, gốc toạ độ (0,0) nằm ở góc dưới bên trái. Giá trị Y càng lớn thì văn bản nằm càng cao trên trang.
      </p>
    </div>
  );
}