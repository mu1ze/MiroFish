#!/usr/bin/env node
/**
 * MiroFish Sports Data Scraper
 * Fetches comprehensive NBA player data from Basketball Reference
 * and formats it for MiroFish consumption
 * 
 * Usage: node scraper.js <player-url-name> <season>
 * Example: node scraper.js brownja02 2026
 */

const https = require('https');
const http = require('http');

// URL slug mapping (first letter of last name + first 5 of first name)
const PLAYER_URLS = {
  'jaylen-brown': 'brownja02',
  'jayson-tatum': 'tatumja01',
  'stephen-curry': 'curryst01',
  'lebron-james': 'jamesle01',
  'luka-doncic': 'doncilu01',
};

const SEASONS = {
  '2026': '2025-26',
  '2025': '2024-25',
  '2024': '2023-24',
};

/**
 * Fetch HTML from a URL
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Extract stats from player page using regex patterns
 */
function parsePlayerOverview(html, playerName) {
  const stats = {};
  
  // Extract basic info
  const heightMatch = html.match(/(\d+)-(\d+).*?\((\d+)/);
  if (heightMatch) {
    stats.height = `${heightMatch[1]}-${heightMatch[2]}`;
    stats.weight = heightMatch[3];
  }
  
  // Extract position
  const posMatch = html.match(/Position:\s*([^<]+)/);
  if (posMatch) {
    stats.position = posMatch[1].trim().split('•')[0].trim();
  }
  
  // Extract team
  const teamMatch = html.match(/Team:\s*<a[^>]*>([^<]+)/);
  if (teamMatch) {
    stats.team = teamMatch[1];
  }
  
  // Extract per-game stats from the main table
  // 2025-26 season row
  const seasonRowMatch = html.match(/2025-26.*?<tr[^>]*class="full_table"[^>]*>([\s\S]*?)<\/tr>/);
  if (seasonRowMatch) {
    const row = seasonRowMatch[1];
    const cells = row.match(/<td[^>]*>([^<]+)<\/td>/g);
    if (cells && cells.length >= 24) {
      stats.games = parseInt(cleanHtml(cells[5]));
      stats.gamesStarted = parseInt(cleanHtml(cells[6]));
      stats.minutes = parseFloat(cleanHtml(cells[7]));
      stats.points = parseFloat(cleanHtml(cells[21]));
      stats.rebounds = parseFloat(cleanHtml(cells[17]));
      stats.assists = parseFloat(cleanHtml(cells[18]));
      stats.steals = parseFloat(cleanHtml(cells[19]));
      stats.blocks = parseFloat(cleanHtml(cells[20]));
      stats.fg = parseFloat(cleanHtml(cells[8]));
      stats.fga = parseFloat(cleanHtml(cells[9]));
      stats.fgPct = parseFloat(cleanHtml(cells[10]));
      stats.threeP = parseFloat(cleanHtml(cells[11]));
      stats.threePA = parseFloat(cleanHtml(cells[12]));
      stats.threePct = parseFloat(cleanHtml(cells[13]));
      stats.twoP = parseFloat(cleanHtml(cells[14]));
      stats.twoPA = parseFloat(cleanHtml(cells[15]));
      stats.twoPct = parseFloat(cleanHtml(cells[16]));
      stats.ft = parseFloat(cleanHtml(cells[22]));
      stats.fta = parseFloat(cleanHtml(cells[23]));
      stats.ftPct = parseFloat(cleanHtml(cells[24]));
      stats.turnovers = parseFloat(cleanHtml(cells[25]));
      stats.personalFouls = parseFloat(cleanHtml(cells[26]));
    }
  }
  
  return stats;
}

/**
 * Parse game log table
 */
function parseGameLog(html, limit = 20) {
  const games = [];
  
  // Match game rows
  const gameRegex = /<tr[^>]*class="(?:full_table|partial_table)"[^>]*>([\s\S]*?)<\/tr>/g;
  let match;
  let count = 0;
  
  while ((match = gameRegex.exec(html)) !== null && count < limit) {
    const row = match[1];
    const cells = row.match(/<td[^>]*>([^<]*)<\/td>/g);
    
    if (cells && cells.length >= 26) {
      const game = {
        date: cleanHtml(cells[0]),
        age: cleanHtml(cells[1]),
        team: cleanHtml(cells[2]),
        opp: cleanHtml(cells[3]),
        result: cleanHtml(cells[4]),
        gs: cleanHtml(cells[5]), // games started
        mp: cleanHtml(cells[6]),  // minutes played
        fg: parseInt(cleanHtml(cells[7])) || 0,
        fga: parseInt(cleanHtml(cells[8])) || 0,
        fgPct: cleanHtml(cells[9]),
        threeP: parseInt(cleanHtml(cells[10])) || 0,
        threePA: parseInt(cleanHtml(cells[11])) || 0,
        threePct: cleanHtml(cells[12]),
        twoP: parseInt(cleanHtml(cells[13])) || 0,
        twoPA: parseInt(cleanHtml(cells[14])) || 0,
        twoPct: cleanHtml(cells[15]),
        efgPct: cleanHtml(cells[16]),
        ft: parseInt(cleanHtml(cells[17])) || 0,
        fta: parseInt(cleanHtml(cells[18])) || 0,
        ftPct: cleanHtml(cells[19]),
        orb: parseInt(cleanHtml(cells[20])) || 0,
        drb: parseInt(cleanHtml(cells[21])) || 0,
        trb: parseInt(cleanHtml(cells[22])) || 0,
        ast: parseInt(cleanHtml(cells[23])) || 0,
        stl: parseInt(cleanHtml(cells[24])) || 0,
        blk: parseInt(cleanHtml(cells[25])) || 0,
        tov: parseInt(cleanHtml(cells[26])) || 0,
        pf: parseInt(cleanHtml(cells[27])) || 0,
        pts: parseInt(cleanHtml(cells[28])) || 0,
        plusMinus: cleanHtml(cells[29]),
      };
      
      // Skip empty rows
      if (game.pts > 0 || game.mp) {
        games.push(game);
        count++;
      }
    }
  }
  
  return games;
}

/**
 * Clean HTML tags and decode entities
 */
function cleanHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Calculate averages from game log
 */
function calculateAverages(games) {
  if (games.length === 0) return {};
  
  const totals = games.reduce((acc, game) => {
    acc.points += game.pts;
    acc.rebounds += game.trb;
    acc.assists += game.ast;
    acc.steals += game.stl;
    acc.blocks += game.blk;
    acc.turnovers += game.tov;
    acc.fg += game.fg;
    acc.fga += game.fga;
    acc.threeP += game.threeP;
    acc.threePA += game.threePA;
    acc.ft += game.ft;
    acc.fta += game.fta;
    acc.minutes += parseInt(game.mp) || 0;
    return acc;
  }, { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fg: 0, fga: 0, threeP: 0, threePA: 0, ft: 0, fta: 0, minutes: 0 });
  
  const count = games.length;
  return {
    games: count,
    points: (totals.points / count).toFixed(1),
    rebounds: (totals.rebounds / count).toFixed(1),
    assists: (totals.assists / count).toFixed(1),
    steals: (totals.steals / count).toFixed(1),
    blocks: (totals.blocks / count).toFixed(1),
    turnovers: (totals.turnovers / count).toFixed(1),
    minutes: (totals.minutes / count).toFixed(1),
    fgPct: ((totals.fg / totals.fga) * 100).toFixed(1),
    threePct: totals.threePA > 0 ? ((totals.threeP / totals.threePA) * 100).toFixed(1) : '0.0',
    ftPct: totals.fta > 0 ? ((totals.ft / totals.fta) * 100).toFixed(1) : '0.0',
    usage: ((totals.fga + totals.fta * 0.44 + totals.turnovers) / (totals.minutes / 12) * 100 / count).toFixed(1),
  };
}

/**
 * Format games as Markdown table
 */
function formatGamesMarkdown(games) {
  let md = `| Date | Opp | Result | MIN | PTS | REB | AST | FG% | 3P% | FT% | FGA | 3PA | STL | TOV |
|--------|-----|--------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
`;
  
  games.forEach(game => {
    const fgPct = game.fga > 0 ? ((game.fg / game.fga) * 100).toFixed(0) : '0';
    const threePct = game.threePA > 0 ? ((game.threeP / game.threePA) * 100).toFixed(0) : '0';
    const ftPct = game.fta > 0 ? ((game.ft / game.fta) * 100).toFixed(0) : '0';
    md += `| ${game.date} | ${game.opp} | ${game.result} | ${game.mp} | ${game.pts} | ${game.trb} | ${game.ast} | ${fgPct}% | ${threePct}% | ${ftPct}% | ${game.fga} | ${game.threePA} | ${game.stl} | ${game.tov} |
`;
  });
  
  return md;
}

/**
 * Generate comprehensive player report for MiroFish
 */
async function generatePlayerReport(playerSlug, season = '2026') {
  const urlSlug = PLAYER_URLS[playerSlug] || playerSlug;
  const seasonSlug = SEASONS[season] || '2025-26';
  
  console.log(`Fetching data for ${playerSlug} (${seasonSlug} season)...`);
  
  // Fetch player overview and game logs in parallel
  const [overviewHtml, gameLogHtml] = await Promise.all([
    fetchUrl(`https://www.basketball-reference.com/players/${urlSlug.charAt(0)}/${urlSlug}.html`),
    fetchUrl(`https://www.basketball-reference.com/players/${urlSlug.charAt(0)}/${urlSlug}/gamelog/${season}`),
  ]);
  
  const overview = parsePlayerOverview(overviewHtml, playerSlug);
  const games = parseGameLog(gameLogHtml, 20);
  const averages = calculateAverages(games);
  
  // Build comprehensive report
  let report = `# ${playerSlug.replace(/-/g, ' ').toUpperCase()} - ${overview.team || 'NBA'}
## ${seasonSlug} Season

### PLAYER PROFILE
| Attribute | Value |
|-----------|-------|
| Position | ${overview.position || 'N/A'} |
| Height | ${overview.height || 'N/A'} |
| Weight | ${overview.weight || 'N/A'} lbs |

### SEASON PER-GAME STATS
| Stat | Value |
|------|-------|
| Games | ${overview.games || 'N/A'} |
| Games Started | ${overview.gamesStarted || 'N/A'} |
| Minutes | ${overview.minutes || 'N/A'} |
| Points | ${overview.points || 'N/A'} |
| Rebounds | ${overview.rebounds || 'N/A'} |
| Assists | ${overview.assists || 'N/A'} |
| Steals | ${overview.steals || 'N/A'} |
| Blocks | ${overview.blocks || 'N/A'} |
| Turnovers | ${overview.turnovers || 'N/A'} |
| Personal Fouls | ${overview.personalFouls || 'N/A'} |

### SHOOTING SPLITS
| Type | Made | Attempt | % |
|------|------|---------|---|
| Field Goals | ${overview.fg} | ${overview.fga} | ${overview.fgPct}% |
| 3-Point | ${overview.threeP} | ${overview.threePA} | ${overview.threePct}% |
| 2-Point | ${overview.twoP} | ${overview.twoPA} | ${overview.twoPct}% |
| Free Throws | ${overview.ft} | ${overview.fta} | ${overview.ftPct}% |

### RECENT FORM (Last ${games.length} Games)
${formatGamesMarkdown(games)}

### RECENT AVERAGES (Last ${games.length} Games)
| Stat | Average |
|------|---------|
| Points | ${averages.points} |
| Rebounds | ${averages.rebounds} |
| Assists | ${averages.assists} |
| Steals | ${averages.steals} |
| Blocks | ${averages.blocks} |
| Turnovers | ${averages.turnovers} |
| Minutes | ${averages.minutes} |
| FG% | ${averages.fgPct}% |
| 3P% | ${averages.threePct}% |
| FT% | ${averages.ftPct}% |

### SCORING DISTRIBUTION (Last ${games.length} Games)
`;

  // Calculate scoring distribution
  const distribution = { '0-9': 0, '10-19': 0, '20-29': 0, '30-39': 0, '40+': 0 };
  games.forEach(g => {
    if (g.pts >= 40) distribution['40+']++;
    else if (g.pts >= 30) distribution['30-39']++;
    else if (g.pts >= 20) distribution['20-29']++;
    else if (g.pts >= 10) distribution['10-19']++;
    else distribution['0-9']++;
  });
  
  Object.entries(distribution).forEach(([range, count]) => {
    report += `- **${range} pts:** ${count} games (${((count/games.length)*100).toFixed(0)}%)\n`;
  });
  
  report += `
### TREND ANALYSIS
`;
  
  // Recent 5 vs previous 5
  const recent5 = games.slice(0, 5);
  const prev5 = games.slice(5, 10);
  
  const recent5Avg = calculateAverages(recent5);
  const prev5Avg = calculateAverages(prev5);
  
  report += `- **Last 5 games avg:** ${recent5Avg.points} pts | ${recent5Avg.rebounds} reb | ${recent5Avg.assists} ast\n`;
  report += `- **Previous 5 games avg:** ${prev5Avg.points} pts | ${prev5Avg.rebounds} reb | ${prev5Avg.assists} ast\n`;
  
  const ptsTrend = parseFloat(recent5Avg.points) - parseFloat(prev5Avg.points);
  report += `- **Trend:** ${ptsTrend > 0 ? '📈' : '📉'} ${ptsTrend > 0 ? '+' : ''}${ptsTrend.toFixed(1)} pts/game\n`;
  
  report += `
---
*Generated: ${new Date().toISOString().split('T')[0]}*  
*Source: Basketball Reference*
`;
  
  return report;
}

// CLI handling
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
MiroFish Sports Data Scraper
============================

Usage: node scraper.js <player> [season]

Examples:
  node scraper.js jaylen-brown 2026
  node scraper.js stephen-curry 2026
  node scraper.js luka-doncic 2025

Available players:
  - jaylen-brown
  - jayson-tatum
  - stephen-curry
  - lebron-james
  - luka-doncic

Seasons: 2024, 2025, 2026 (maps to 2023-24, 2024-25, 2025-26)
`);
  process.exit(1);
}

const playerSlug = args[0].toLowerCase();
const season = args[1] || '2026';

generatePlayerReport(playerSlug, season)
  .then(report => {
    console.log(report);
    
    // Also save to file
    const fs = require('fs');
    const filename = `./sports-data/${playerSlug}-${season}.md`;
    fs.writeFileSync(filename, report);
    console.log(`\n✅ Saved to ${filename}`);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
