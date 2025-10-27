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

// Update HTML pages before PDF generation
async function updatedPdf(data) {
  const htmlPath = path.join(__dirname, "./index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const $ = cheerio.load(html);

  const page2 = $('section[aria-label="Page 2"]');
  if (data.aboutIntro) page2.find("span.t.s5").eq(0).text(data.aboutIntro);
  if (data.disclaimerContent) page2.find("span.t.s5").eq(6).text(data.disclaimerContent);

  const page3 = $('section[aria-label="Page 3"]');
  if (data.analysisIntro) page3.find("span.t.sm").eq(12).text(data.analysisIntro);
  if (data.psNote) page3.find("span.t.sm").eq(13).text(data.psNote);

  const page4 = $('section[aria-label="Page 4"]');
  if (data.ExecutiveSummary) page4.find("span.t.s5").eq(0).text(data.ExecutiveSummary);
  if (data.BottomDesc) page4.find("span.t.sm").eq(0).text(data.BottomDesc);

  const page6 = $('section[aria-label="Page 6"]');
  if (data.coreStabilityIntro) page6.find("span.t.s5").eq(5).text(data.coreStabilityIntro);
  if (data.adaptabilityIntro) page6.find("span.t.s5").eq(6).text(data.adaptabilityIntro);
  if (data.sustainablePerformanceDesc) page6.find("span.t.s5").eq(7).text(data.sustainablePerformanceDesc);
  if (data.burnoutIntro) page6.find("span.t.s5").eq(14).text(data.burnoutIntro);

  if (data.surveyItem1) page6.find("span.t.s14").eq(0).text(data.surveyItem1);
  if (data.surveyItem2) page6.find("span.t.s14").eq(1).text(data.surveyItem2);
  if (data.surveyItem3) page6.find("span.t.s14").eq(2).text(data.surveyItem3);

  fs.writeFileSync(htmlPath, $.html(), "utf8");
  return true;
}

// API: Update + Generate PDF
app.post("/api/generate-pdf", async (req, res) => {
  try {
    await updatedPdf(req.body);
    
    const pdfPath = await generatePDF();
    console.log("PDF generated successfully");

    res.status(200).json({
      success: true,
      pdfPath
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error updating pages or generating PDF",
      error: err.message,
    });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

