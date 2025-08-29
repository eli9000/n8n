const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const app = express();

app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium-browser",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    // Set a longer timeout (e.g., 60 seconds)
    await page
      .goto(url, { waitUntil: "networkidle2", timeout: 60000 })
      .catch(async (err) => {
        console.error("Navigation failed:", err.message);
        // Take a screenshot on timeout
        const screenshotPath = path.join(
          "/data/shared/screenshots",
          `screenshot-${Date.now()}.png`
        );
        const pdfPath = path.join("/data/shared/pdfs", `hn-${Date.now()}.pdf`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        await page.pdf({ path: pdfPath });
        await browser.close();
        return res.status(500).json({
          error: "Navigation timed out",
          screenshot: screenshotPath,
          pdf: pdfPath,
        });
      });

    // Try to extract text
    const jobText = await page.evaluate(() => {
      const selectors = [
        "#jobDescriptionText",
        ".description__text",
        'div[id*="job"]',
        "body",
      ];
      for (let selector of selectors) {
        const element = document.querySelector(selector);
        if (element) return element.innerText.replace(/\s+/g, " ").trim();
      }
      return document.body.innerText.replace(/\s+/g, " ").trim();
    });

    // Take a screenshot as a fallback
    const screenshotPath = path.join(
      "/data/shared/screenshots",
      `screenshot-${Date.now()}.png`
    );
    const pdfPath = path.join("/data/shared/pdfs", `hn-${Date.now()}.pdf`);

    await page.screenshot({ path: screenshotPath, fullPage: true });
    await page.pdf({ path: pdfPath });

    await browser.close();
    res.json({ jobText, screenshot: screenshotPath, pdf: pdfPath });
  } catch (error) {
    res.status(500).json({ error: error.message, screenshot: null });
  }
});

app.listen(3000, () => console.log("Puppeteer service running on port 3000"));
