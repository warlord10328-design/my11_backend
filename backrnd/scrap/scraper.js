/*import axios from "axios";
import * as cheerio from "cheerio";

const scheduleUrl = "https://www.crictracker.com/upcoming-cricket-schedule/";

async function getMatchUrls() {
  const { data } = await axios.get(scheduleUrl, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const $ = cheerio.load(data);
  const matchUrls = [];

  $("a").each((i, el) => {
    const text = $(el).text().trim();
    if (text === "Overview") {
      const href = $(el).attr("href");
      if (href) {
        const fullUrl = "https://www.crictracker.com" + href;
        matchUrls.push(fullUrl);
      }
    }
  });

  console.log("Match URLs:", matchUrls);
}

getMatchUrls();*/
import puppeteer from "puppeteer";

const url = "https://www.crictracker.com/upcoming-cricket-schedule/";

const navbarTexts = ["International", "League", "Domestic", "Women"];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  const allMatchUrls = [];

  for (const navText of navbarTexts) {
    await page.evaluate((text) => {
      const btn = Array.from(document.querySelectorAll(".nav-selection.if"))
        .find(b => b.textContent.trim() === text);
      if (btn) btn.click();
    }, navText);

    await page.waitForSelector("a");

    const matchUrls = await page.$$eval("a", links =>
      links
        .filter(a => a.textContent.trim() === "Overview")
        .map(a => a.href)
    );

    console.log(`${navText} matches:`, matchUrls);
    allMatchUrls.push(...matchUrls);
  }

  console.log("All scraped match URLs:", allMatchUrls);
  await browser.close();
})();