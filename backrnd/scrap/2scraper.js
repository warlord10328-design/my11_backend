/*import puppeteer from "puppeteer";

async function scrapeUrls() {
  const url = "https://www.espncricinfo.com/live-cricket-match-schedule-fixtures";

  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  // Collect all <a> href links and filter only match score pages
  const matchUrls = await page.$$eval("a", (links) =>
    links
      .map((a) => a.href)
      .filter((href) => href.includes("/live-cricket-score"))
  );

  console.log(matchUrls);

  await browser.close();
}

scrapeUrls();*/


/*import axios from "axios";
import fs from "fs";

async function getMatches() {
  try {
    const response = await axios.get(
      "https://hs-consumer-api.espncricinfo.com/v1/pages/matches/current?lang=en&latest=true",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
          "Accept": "/*",
          "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Origin": "https://www.espncricinfo.com",
          "Referer": "https://www.espncricinfo.com/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "x-hsci-auth-token": "exp=1763924548~hmac=5dbb03c6e6bacf5358319506a4109125d81e43b91ac7fd313aa284d6afe62fd4",
        },
      }
    );

    fs.writeFileSync("matches.json", JSON.stringify(response.data, null, 2));

    console.log("JSON saved to matches.json");
  } catch (error) {
    console.error(
      "Error:",
      error.response?.status,
      error.response?.statusText
    );
  }
}

getMatches();*/

import fs from "fs";

// Load JSON file
const rawData = fs.readFileSync("matches.json", "utf-8");
const json = JSON.parse(rawData);

let output = "";

// Loop through matches
json.matches.forEach(match => {
  output += `Stage       : ${match.stage || ""}\n`;
  output += `TeamA       : ${match.teams[0]?.team?.name || ""}\n`;
  output += `TeamB       : ${match.teams[1]?.team?.name || ""}\n`;
  output += `Date        : ${match.startDate?.slice(0,10) || ""}\n`;
  output += `Time        : ${match.startTime?.slice(11,16) || ""}\n`;
  output += `Venue       : ${match.ground?.name || ""}\n`;
  output += `Tournament  : ${match.series?.name || ""}\n`;
  output += "-------------------------------\n";
});

// Save to text file
//fs.writeFileSync("structured_matches.txt", output);

console.log(output);
