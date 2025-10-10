import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { PDFDocument } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePDF() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const htmlPath = path.join(__dirname, "index.html");
  const fileUrl = pathToFileURL(htmlPath).href;
  await page.goto(fileUrl, { waitUntil: "networkidle0" });

  await new Promise((resolve) => setTimeout(resolve, 1500));

  await page.addStyleTag({
    content: `
      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
        width: 1920px;
        height: auto;
        overflow: visible;
        box-sizing: border-box;
      }

      .page-container {
        margin: 0 auto;
        width: 1920px;
      }

      .page {
        width: 1920px;
        height: 1080px;
        background: #fff;
        overflow: hidden;
        box-sizing: border-box;
        page-break-inside: avoid;
        page-break-after: avoid;
      }

      @page {
        size: 1920px 1080px;
        margin: 0;
      }
    `,
  });

  const numPages = await page.evaluate(
    () => document.querySelectorAll(".page").length
  );
  console.log(`Detected ${numPages} pages`);

  // Generate PDF in memory (not saved to disk)
  const pdfBuffer = await page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
    width: `${1920 / 96}in`,
    height: `${1080 / 96}in`,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    scale: 1,
    landscape: true,
  });

  await browser.close();
  console.log("PDF generated in memory");

  // ---- Remove even-numbered pages ----
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = pdfDoc.getPageCount();

  const newPdf = await PDFDocument.create();

  for (let i = 0; i < totalPages; i++) {
    const pageNumber = i + 1;
    if (pageNumber % 2 !== 0) { // keep only odd pages
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
    }
  }

  const newPdfBytes = await newPdf.save();
  const finalOutput = path.join(__dirname, "output_final.pdf");
  fs.writeFileSync(finalOutput, newPdfBytes);

  console.log("Final PDF created", finalOutput);
}

generatePDF();
