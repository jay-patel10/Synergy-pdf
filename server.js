import express from "express";
import fs from "fs";
import * as cheerio from "cheerio";
import path from "path";
import { fileURLToPath } from "url";
import { generatePDF } from "./generatePDF.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve fonts folder with proper headers - CRITICAL for font loading
app.use('/fonts', express.static(path.join(__dirname, 'fonts'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.woff2')) {
      res.set('Content-Type', 'font/woff2');
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Serve static files from root directory
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache');
    }
  }
}));

// Explicitly serve index.html
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Update HTML pages before PDF generation
async function updatedPdf(data) {
  const htmlPath = path.join(__dirname, "./index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const $ = cheerio.load(html);

  // Page 2 - Using new class names
  const page2 = $('section[aria-label="Page 2"]');
  if (data.aboutIntro) {
    page2.find("span.text.text-body-lg").eq(0).text(data.aboutIntro);
  }
  if (data.disclaimerContent) {
    page2.find("span.text.text-body-lg").eq(6).text(data.disclaimerContent);
  }

  // Page 3 - Using new class names
  const page3 = $('section[aria-label="Page 3"]');
  if (data.analysisIntro) {
    page3.find("span.text.text-body-sm").eq(12).text(data.analysisIntro);
  }
  if (data.psNote) {
    page3.find("span.text.text-body-sm").eq(13).text(data.psNote);
  }

  // Page 4 - Using new class names
  const page4 = $('section[aria-label="Page 4"]');
  if (data.ExecutiveSummary) {
    page4.find("span.text.text-body-lg").eq(0).text(data.ExecutiveSummary);
  }
  if (data.BottomDesc) {
    page4.find("span.text.text-body-sm").eq(0).text(data.BottomDesc);
  }

  // Page 6 - Using new class names
  const page6 = $('section[aria-label="Page 6"]');
  if (data.coreStabilityIntro) {
    page6.find("span.text.text-body-lg").eq(5).text(data.coreStabilityIntro);
  }
  if (data.adaptabilityIntro) {
    page6.find("span.text.text-body-lg").eq(6).text(data.adaptabilityIntro);
  }
  if (data.sustainablePerformanceDesc) {
    page6.find("span.text.text-body-lg").eq(7).text(data.sustainablePerformanceDesc);
  }
  if (data.burnoutIntro) {
    page6.find("span.text.text-body-lg").eq(14).text(data.burnoutIntro);
  }

  // Survey items - Using new class names
  if (data.surveyItem1) {
    page6.find("span.text.heading-gray-black-lg").eq(0).text(data.surveyItem1);
  }
  if (data.surveyItem2) {
    page6.find("span.text.heading-gray-black-lg").eq(1).text(data.surveyItem2);
  }
  if (data.surveyItem3) {
    page6.find("span.text.heading-gray-black-lg").eq(2).text(data.surveyItem3);
  }

  fs.writeFileSync(htmlPath, $.html(), "utf8");
  return true;
}

// API: Update + Generate PDF
app.post("/api/generate-pdf", async (req, res) => {
  try {
    await updatedPdf(req.body);
    
    const pdfPath = await generatePDF();
    console.log("PDF generated successfully at:", pdfPath);

    res.status(200).json({
      success: true,
      pdfPath
    });
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).json({
      success: false,
      message: "Error updating pages or generating PDF",
      error: err.message,
    });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);  
  // Verify fonts exist
  const fontsDir = path.join(__dirname, 'fonts');
  if (fs.existsSync(fontsDir)) {
    const fonts = fs.readdirSync(fontsDir).filter(f => f.endsWith('.woff2'));
  } else {
    console.error('Fonts directory not found!');
  }
});