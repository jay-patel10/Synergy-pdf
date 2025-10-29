import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Convert font to base64
function fontToBase64(fontPath) {
  const fontData = fs.readFileSync(fontPath);
  return `data:font/woff2;charset=utf-8;base64,${fontData.toString('base64')}`;
}

export async function generatePDF() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--font-render-hinting=none",
      "--disable-gpu"
    ],
  });

  const page = await browser.newPage();

  
  await page.goto('http://localhost:5000/index.html', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Inject fonts as base64 directly into the page
  const fontsDir = path.join(__dirname, 'fonts');
  const fontCSS = `
    @font-face {
      font-family: 'ArialMT_lf';
      src: url('${fontToBase64(path.join(fontsDir, 'ArialMT_lf.woff2'))}') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: block;
    }

    @font-face {
      font-family: 'Lato-Semibold_n5';
      src: url('${fontToBase64(path.join(fontsDir, 'Lato-Semibold_n5.woff2'))}') format('woff2');
      font-weight: 600;
      font-style: normal;
      font-display: block;
    }

    @font-face {
      font-family: 'Montserrat-Black_li';
      src: url('${fontToBase64(path.join(fontsDir, 'Montserrat-Black_li.woff2'))}') format('woff2');
      font-weight: 900;
      font-style: normal;
      font-display: block;
    }

    @font-face {
      font-family: 'Montserrat-Bold_l7';
      src: url('${fontToBase64(path.join(fontsDir, 'Montserrat-Bold_l7.woff2'))}') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: block;
    }

    @font-face {
      font-family: 'Montserrat-Medium_l6';
      src: url('${fontToBase64(path.join(fontsDir, 'Montserrat-Medium_l6.woff2'))}') format('woff2');
      font-weight: 500;
      font-style: normal;
      font-display: block;
    }
      
    @font-face {
      font-family: 'Montserrat-SemiBoldItalic_m8';
      src: url('${fontToBase64(path.join(fontsDir, 'Montserrat-SemiBoldItalic_m8.woff2'))}') format('woff2');
      font-weight: 600;
      font-style: italic;
      font-display: block;
    }

    @font-face {
      font-family: 'Montserrat-SemiBold_l8';
      src: url('${fontToBase64(path.join(fontsDir, 'Montserrat-SemiBold_l8.woff2'))}') format('woff2');
      font-weight: 600;
      font-style: normal;
      font-display: block;
    }
  `;

  await page.addStyleTag({ content: fontCSS });

  // Wait for fonts to load
  await page.evaluate(() => {
    return document.fonts.ready;
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Add custom page styling
  await page.addStyleTag({
    content: `
      html, body {
        margin: 0;
        padding: 0;
        width: 1920px;
        height: auto;
        background: #fff;
      }
      .page-container {
        margin: 0 auto;
        width: 1920px;
      }
      .page {
        width: 1920px;
        height: 1080px;
        page-break-inside: avoid;
      }
      @page {
        size: 1920px 1080px;
        margin: 0;
      }
    `,
  });

  // Count pages
  const numPages = await page.evaluate(
    () => document.querySelectorAll(".page").length
  );

  // Final font status check
  const fontsLoaded = await page.evaluate(() => {
    const fonts = Array.from(document.fonts);
    const loadedFonts = fonts.filter(font => font.status === 'loaded');
    return {
      total: fonts.length,
      loaded: loadedFonts.length,
      fontNames: loadedFonts.map(f => f.family)
    };
  });

  // Generate PDF
  console.log('Generating PDF...');
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

  // Process PDF to remove even pages
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = pdfDoc.getPageCount();

  const newPdf = await PDFDocument.create();

  // Keep only odd-numbered pages (1, 3, 5, etc.)
  for (let i = 0; i < totalPages; i++) {
    if ((i + 1) % 2 !== 0) {
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
    }
  }

  const newPdfBytes = await newPdf.save();
  const finalOutput = path.join(__dirname, "output_final.pdf");
  fs.writeFileSync(finalOutput, newPdfBytes);

  return finalOutput;
}