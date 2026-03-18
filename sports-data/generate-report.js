#!/usr/bin/env node
/**
 * MiroFish Player Report Generator
 * Takes player data and generates formatted Markdown for MiroFish
 * 
 * Usage: node generate-report.js <player-key>
 * Example: node generate-report.js jaylen-brown
 */

const fs = require('fs');
const path = require('path');

const PLAYERS_FILE = path.join(__dirname, 'players.json');

function loadPlayers() {
  const data = fs.readFileSync(PLAYERS_FILE, 'utf8');
  return JSON.parse(data);
}

function calculateAverages(games) {
  if (!games || games.length === 0) return {};
  
  const totals = games.reduce((acc, g) => ({
    pts: acc.pts + (g.pts || 0),
    reb: acc.reb + (g.reb || 0),
    ast: acc.ast + (g.ast || 0),
    stl: acc.stl + (g.stl || 0),
    blk: acc.blk + (g.blk || 0),
    tov: acc.tov + (g.tov || 0),
    min: acc.min + (parseInt(g.min) || 0),
    fg: acc.fg + (g.fg || 0),
    fga: acc.fga + (g.fga || 0),
    threeP: acc.threeP + (g.threeP || 0),
    threePA: acc.threePA + (g.threePA || 0),
    ft: acc.ft + (g.ft || 0),
    fta: acc.fta + (g.fta || 0),
  }), { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, min: 0, fg: 0, fga: 0, threeP: 0, threePA: 0, ft: 0, fta: 0 });
  
  const n = games.length;
  return {
    pts: (totals.pts / n).toFixed(1),
    reb: (totals.reb / n).toFixed(1),
    ast: (totals.ast / n).toFixed(1),
    stl: (totals.stl / n).toFixed(1),
    blk: (totals.blk / n).toFixed(1),
    tov: (totals.tov / n).toFixed(1),
    min: (totals.min / n).toFixed(1),
    fgPct: totals.fga > 0 ? ((totals.fg / totals.fga) * 100).toFixed(1) : '0.0',
    threePct: totals.threePA > 0 ? ((totals.threeP / totals.threePA) * 100).toFixed(1) : '0.0',
    ftPct: totals.fta > 0 ? ((totals.ft / totals.fta) * 100).toFixed(1) : '0.0',
  };
}

function generateReport(playerKey) {
  const players = loadPlayers();
  const p = players[playerKey];
  
  if (!p) {
    console.log(`Player "${playerKey}" not found.`);
    console.log('Available players:', Object.keys(players).join(', '));
    process.exit(1);
  }
  
  const season = p.season;
  const games = p.games;
  const recent = calculateAverages(games);
  
  // Scoring distribution
  const dist = { '0-9': 0, '10-19': 0, '20-29': 0, '30-39': 0, '40+': 0 };
  games.forEach(g => {
    const pts = g.pts || 0;
    if (pts >= 40) dist['40+']++;
    else if (pts >= 30) dist['30-39']++;
    else if (pts >= 20) dist['20-29']++;
    else if (pts >= 10) dist['10-19']++;
    else dist['0-9']++;
  });
  
  // Trend
  const last5 = games.slice(0, 5);
  const prev5 = games.slice(5, 10);
  const last5Avg = calculateAverages(last5);
  const prev5Avg = calculateAverages(prev5);
  const trend = (parseFloat(last5Avg.pts) - parseFloat(prev5Avg.pts)).toFixed(1);
  
  const isHome = games[0].homeAway === 'home';
  const homeGames = games.filter(g => g.homeAway === 'home');
  const awayGames = games.filter(g => g.homeAway === 'away');
  const homeAvg = calculateAverages(homeGames.slice(0, 10));
  const awayAvg = calculateAverages(awayGames.slice(0, 10));
  
  const report = `# 🏀 ${p.name.toUpperCase()} - ${p.team}
## 2025-26 NBA Season

---

### 👤 PLAYER PROFILE
| Attribute | Value |
|-----------|-------|
| **Name** | ${p.name} |
| **Team** | ${p.team} |
| **Position** | ${p.position} |
| **Height** | ${p.height} |
| **Weight** | ${p.weight} lbs |
| **Age** | ${p.age} |

---

### 📊 SEASON STATS (Per Game)
| Stat | Season Avg | Recent ${games.length} Games |
|------|------------|------------------------------|
| **Points** | ${season.pts} | **${recent.pts}** |
| **Rebounds** | ${season.reb} | ${recent.reb} |
| **Assists** | ${season.ast} | ${recent.ast} |
| Steals | ${season.stl} | ${recent.stl} |
| Blocks | ${season.blk} | ${recent.blk} |
| Minutes | ${season.min} | ${recent.min} |
| Turnovers | - | ${recent.tov} |

### 🎯 SHOOTING EFFICIENCY
| Type | Season | Recent |
|------|--------|--------|
| FG% | ${season.fgPct}% | ${recent.fgPct}% |
| 3P% | ${season.threePct}% | ${recent.threePct}% |
| FT% | ${season.ftPct}% | ${recent.ftPct}% |
| TS% | ${season.tsPct}% | - |
| Usage | ${season.usage}% | - |

---

### 📈 RECENT GAMES (Last ${games.length})

| Date | Opp | Result | MIN | **PTS** | REB | AST | FG% | 3P% | FT% | +/- |
|------|-----|--------|-----|---------|-----|-----|-----|-----|-----|-----|
${games.map(g => `| ${g.date} | ${g.homeAway === 'home' ? 'vs' : '@'} ${g.opp} | ${g.result} | ${g.min} | **${g.pts}** | ${g.reb} | ${g.ast} | ${g.fgPct}% | ${g.threePct}% | ${g.ftPct}% | ${g.pm} |`).join('\n')}

---

### 📉 TREND ANALYSIS

| Metric | Last 5 | Previous 5 | Trend |
|--------|--------|------------|-------|
| Points | ${last5Avg.pts} | ${prev5Avg.pts} | ${trend > 0 ? '📈 +' : trend < 0 ? '📉 ' : '➡️ '}${trend} |
| Rebounds | ${last5Avg.reb} | ${prev5Avg.reb} | - |
| Assists | ${last5Avg.ast} | ${prev5Avg.ast} | - |
| FG% | ${last5Avg.fgPct}% | ${prev5Avg.fgPct}% | - |

### 🎯 SCORING DISTRIBUTION (Last ${games.length} Games)
${Object.entries(dist).map(([range, count]) => {
  const pct = ((count / games.length) * 100).toFixed(0);
  const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
  return `| ${range} pts | ${count} games | ${pct}% | ${bar} |`;
}).join('\n')}

---

### 🏠 HOME vs AWAY SPLITS (Recent)

| Metric | Home (Last 10) | Away (Last 10) |
|--------|----------------|----------------|
| Points | ${homeAvg.pts} | ${awayAvg.pts} |
| FG% | ${homeAvg.fgPct}% | ${awayAvg.fgPct}% |

---

### 🔥 HOT/COLD ANALYSIS

- **Hot games (30+ pts):** ${games.filter(g => g.pts >= 30).length} (${((games.filter(g => g.pts >= 30).length / games.length) * 100).toFixed(0)}%)
- **Cold games (<15 pts):** ${games.filter(g => g.pts < 15).length} (${((games.filter(g => g.pts < 15).length / games.length) * 100).toFixed(0)}%)

---

### 🎯 MIROFISH PREDICTION CONTEXT

Use this data to predict tonight's performance:

**Current Form:** ${recent.pts} PPG (last ${games.length} games)  
**Trend:** ${trend > 0 ? 'Improving 📈' : trend < 0 ? 'Declining 📉' : 'Stable ➡️'} (${trend > 0 ? '+' : ''}${trend} pts/game)  
**Tonight:** ${isHome ? 'Home game' : 'Away game'}  

**Key Factors for Prediction:**
1. Recent scoring average: ${recent.pts} pts
2. Shot volume: ~${Math.round(parseFloat(recent.min) * 0.63)} FGA per game
3. Efficiency: ${recent.fgPct}% FG, ${recent.threePct}% 3P
4. Home/Away: ${isHome ? 'Home' : 'Away'} games average ${isHome ? homeAvg.pts : awayAvg.pts} pts
5. Recent hot/cold: ${games.filter(g => g.pts >= 30).length} hot, ${games.filter(g => g.pts < 15).length} cold

---

*Generated: ${new Date().toISOString()}*  
*Data Source: ESPN, Basketball Reference*
`;

  return report;
}

// CLI
const args = process.argv.slice(2);
const playerKey = args[0] || 'jaylen-brown';

const report = generateReport(playerKey);
console.log(report);

// Save to file
const outputPath = path.join(__dirname, `${playerKey}-report.md`);
fs.writeFileSync(outputPath, report);
console.log(`\n✅ Saved to ${outputPath}`);
