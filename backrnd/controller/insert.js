import axios from "axios";
import * as cheerio from "cheerio";

export async function fetchSquad(url) {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const $ = cheerio.load(html);

    let teamA = "";
    let teamB = "";

    // Extract team names
    const teamNameSection = $("section > div").first();
    teamA = teamNameSection.find("h3:nth-child(1) > span:nth-child(1)").text().trim();
    teamB = teamNameSection.find("h3:nth-child(2) > span:nth-child(1)").text().trim();

    const playersA = [];
    const playersB = [];

    // Helper function to extract players with OR without <a> tag
    function extractPlayers(parent, teamIndex) {
      const players = [];

      // Pattern 1: <span><a>PLAYER</a></span>
      parent
        .find(`> div:nth-child(${teamIndex}) > div > div > span > a`)
        .each((i, el) => {
          players.push($(el).text().trim());
        });

      // Pattern 2: <span>PLAYER</span> (WITHOUT <a> tag)
      parent
        .find(`> div:nth-child(${teamIndex}) > div > div > span`)
        .each((i, el) => {
          // remove child <a> if exists, then get text
          const name = $(el)
            .clone()
            .children("a")
            .remove()
            .end()
            .text()
            .trim();

          if (name && !players.includes(name)) {
            players.push(name);
          }
        });

      return players;
    }

    // Get main squads
    const teamSection = $("section > div")
      .filter((i, el) => $(el).find("div > div > span").length > 5)
      .first();

    if (teamSection.length === 0) {
      throw new Error("Player section not found!");
    }

    playersA.push(...extractPlayers(teamSection, 1));
    playersB.push(...extractPlayers(teamSection, 2));

    // EXTRA PLAYERS SECTION
    const extraSection = $("section > div:nth-child(5)").filter(
      (i, el) => $(el).find("div > div > span").length > 5
    ).first();

    if (extraSection.length > 0) {
      const extraA = extractPlayers(extraSection, 1);
      const extraB = extractPlayers(extraSection, 2);

      playersA.push(...extraA);
      playersB.push(...extraB);
    }

    console.log("TeamA:", teamA);
    console.log("TeamB:", teamB);
    console.log("Players A:", playersA);
    console.log("Players B:", playersB);

    return {
      teamA,
      teamB,
      playersA,
      playersB,
    };

  } catch (err) {
    console.error("Scraper error:", err.message);
    throw new Error(err.message);
  }
}
