const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

/**
 * Extract clean text and page metadata from file buffer
 * @param {Buffer} buffer - File buffer from MongoDB
 * @param {string} mimeType - File mime type
 * @returns {Promise<{ text: string, numPages: number, method: string }>}
 */
async function extractTextFromBuffer(buffer, mimeType = "application/pdf") {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return { text: "", numPages: 1, method: "empty" };
  }

  // 1. PDF Parsing via pdf-parse
  if (
    mimeType.includes("pdf") ||
    buffer.slice(0, 4).toString() === "%PDF"
  ) {
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }

      const extractedText = (result?.text || "").trim();
      if (extractedText.length > 20) {
        return {
          text: extractedText,
          numPages: result?.total || result?.pages?.length || 1,
          method: "pdf-parse",
        };
      }
    } catch (err) {
      console.warn("[textExtractor] PDFParse warning:", err.message);
    }
  }

  // 2. DOCX Parsing via mammoth
  if (
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("docx") ||
    buffer.slice(0, 2).toString() === "PK"
  ) {
    try {
      const docxResult = await mammoth.extractRawText({ buffer });
      const docxText = (docxResult?.value || "").trim();
      if (docxText.length > 20) {
        return {
          text: docxText,
          numPages: Math.max(1, Math.ceil(docxText.split(/\s+/).length / 450)),
          method: "mammoth",
        };
      }
    } catch (err) {
      console.warn("[textExtractor] Mammoth warning:", err.message);
    }
  }

  // 3. Fallback extraction (clean ASCII strings from buffer)
  const rawString = buffer.toString("utf8");
  const cleanedText = rawString
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    text: cleanedText,
    numPages: Math.max(1, Math.ceil(cleanedText.split(/\s+/).length / 450)),
    method: "fallback",
  };
}

module.exports = {
  extractTextFromBuffer,
};
