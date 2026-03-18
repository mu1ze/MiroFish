#!/usr/bin/env node
/**
 * MiroFish Player Data CLI
 * 
 * Usage:
 *   node add-player.js <player-name>
 *   node add-player.js list
 *   node add-player.js generate <player-key>
 * 
 * Examples:
 *   node add-player.js "jaylen brown"
 *   node add-player.js "stephen curry"
 *   node add-player.js list
 *   node add-player.js generate jaylen-brown
 */

const fs = require('fs');
const path = require('path');

const PLAYERS_FILE = path.join(__dirname, 'players.json');
const PLAYER_SLUGS = {
  'jaylen brown': 'jaylen-brown',
  'jayson tatum': 'jayson-tatum',
  'stephen curry': 'stephen-curry',
  'lebron james': 'lebron-james',
  'luka dondic': 'luka-doncic',
  'luka doncic': 'luka-doncic',
  'giannis antetokounmpo': 'giannis-antetokounmpo',
  'nikola jokic': 'nikola-jokic',
  'shai gilgeous-alexander': 'shai-gilgeous-alexander',
  'jalen brunsson': 'jalen-brunson',
  'jalen brunson': 'jalen-brunson',
  'kevin durant': 'kevin-durant',
  'devin booker': 'devin-booker',
  'damian lillard': 'damian-lillard',
  'anthony edwards': 'anthony-edwards',
  'tyrese haliburton': 'tyrese-halyburton',
  ' Donovan mitchell': 'donovan-mitchell',
  'donovan mitchell': 'donovan-mitchell',
};

// Load existing players
function loadPlayers() {
  try {
    if (fs.existsSync(PLAYERS_FILE)) {
      return JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading players:', e.message);
  }
  return {};
}

// Save players
function savePlayers(players) {
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
  console.log('✅ Saved to players.json');
}

// Generate a simple report from player data
function generateReport(key) {
  const players = loadPlayers();
  const p = players[key];
  
  if (!p) {
    console.log(`Player "${key}" not found.`);
    console.log('Available:', Object.keys(players).join(', '));
    return;
  }
  
  const games = p.games || [];
  const recent = games.slice(0, 15);
  
  // Calculate averages
  const avg = games.length ? {
    pts: (games.reduce((s, g) => s + (g.pts || 0), 0) / games.length).toFixed(1),
    reb: (games.reduce((s, g) => s + (g.reb || 0), 0) / games.length).toFixed(1),
    ast: (games.reduce((s, g) => s + (g.ast || 0), 0) / games.length).toFixed(1),
  } : { pts: 0, reb: 0, ast: 0 };
  
  const season = p.season || {};
  
  console.log(`
# ${p.name.toUpperCase()} - ${p.team}
## 2025-26 NBA Season

### Profile
- Position: ${p.position}
- Height: ${p.height}
- Weight: ${p.weight} lbs
- Age: ${p.age}

### Season Stats (${season.games || games.length} games)
| Stat | Value |
|------|-------|
| Points | ${season.pts || avg.pts} |
| Rebounds | ${season.reb || avg.reb} |
| Assists | ${season.ast || avg.ast} |
| FG% | ${season.fgPct || 'N/A'}% |
| 3P% | ${season.threePct || 'N/A'}% |
| FT% | ${season.ftPct || 'N/A'}% |

### Recent Games (Last ${recent.length})
`);
  
  recent.forEach(g => {
    console.log(`${g.date}: ${g.opp} ${g.result} - ${g.pts} pts | ${g.reb} reb | ${g.ast} ast`);
  });
  
  // Save to markdown
  const reportPath = path.join(__dirname, `${key}-report.md`);
  const report = generateMarkdown(key, p);
  fs.writeFileSync(reportPath, report);
  console.log(`\n✅ Report saved to ${reportPath}`);
}

function generateMarkdown(key, p) {
  const games = p.games || [];
  const recent = games.slice(0, 15);
  const season = p.season || {};
  
  // Calculate averages
  const avg = games.length ? {
    pts: (games.reduce((s, g) => s + (g.pts || 0), 0) / games.length).toFixed(1),
    reb: (games.reduce((s, g) => s + (g.reb || 0), 0) / games.length).toFixed(1),
    ast: (games.reduce((s, g) => s + (g.ast || 0), 0) / games.length).toFixed(1),
  } : { pts: 0, reb: 0, ast: 0 };
  
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
  
  let md = `# ${p.name.toUpperCase()} - ${p.team}
## 2025-26 NBA Season (Updated: ${new Date().toISOString().split('T')[0]})

---

### PLAYER PROFILE
| Attribute | Value |
|-----------|-------|
| **Name** | ${p.name} |
| **Team** | ${p.team} |
| **Position** | ${p.position} |
| **Height** | ${p.height} |
| **Weight** | ${p.weight} lbs |
| **Age** | ${p.age} |

---

### SEASON STATS (${season.games || games.length} Games)
| Stat | Season Avg | Recent Avg |
|------|------------|------------|
| **Points** | ${season.pts || avg.pts} | ${avg.pts} |
| **Rebounds** | ${season.reb || avg.reb} | ${avg.reb} |
| **Assists** | ${season.ast || avg.ast} | ${avg.ast} |
| FG% | ${season.fgPct || 'N/A'}% | - |
| 3P% | ${season.threePct || 'N/A'}% | - |
| FT% | ${season.ftPct || 'N/A'}% | - |
| TS% | ${season.tsPct || 'N/A'}% | - |

---

### RECENT GAMES (Last ${recent.length})

| Date | Opp | Result | MIN | **PTS** | REB | AST | FG% | 3P% | +/- |
|------|-----|--------|-----|---------|-----|-----|-----|-----|-----|
`;
  
  recent.forEach(g => {
    md += `| ${g.date} | ${g.homeAway === 'home' ? 'vs' : '@'} ${g.opp} | ${g.result} | ${g.min || '0'} | **${g.pts}** | ${g.reb} | ${g.ast} | ${g.fgPct}% | ${g.threePct}% | ${g.pm} |
`;
  });
  
  md += `
---

### SCORING DISTRIBUTION
`;
  
  Object.entries(dist).forEach(([range, count]) => {
    const pct = ((count / games.length) * 100).toFixed(0);
    md += `- **${range} pts:** ${count} games (${pct}%)\n`;
  });
  
  md += `
---

### MIROFISH PREDICTION CONTEXT

**Current Form:** ${avg.pts} PPG (last ${games.length} games)  
**Tonight:** ${games[0]?.homeAway === 'home' ? 'Home' : 'Away'} game  

**Key Factors:**
1. Recent average: ${avg.pts} pts
2. FG%: ${season.fgPct || 'N/A'}%
3. 3P%: ${season.threePct || 'N/A'}%

---

*Generated: ${new Date().toISOString()}*
`;
  
  return md;
}

// List players
function listPlayers() {
  const players = loadPlayers();
  console.log('\n📋 Available Players:\n');
  Object.entries(players).forEach(([key, p]) => {
    const games = p.games?.length || 0;
    const pts = p.season?.pts || p.games?.[0]?.pts || 'N/A';
    console.log(`  ${key}`);
    console.log(`    Team: ${p.team} | Games: ${games} | PPG: ${pts}\n`);
  });
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log(`
🏀 MiroFish Player Data CLI
==========================

Usage:
  node add-player.js <player-name>   Add a player (manual entry)
  node add-player.js list            List all players
  node add-player.js generate <key> Generate report for player

Available player slugs:
  jaylen-brown, stephen-curry, luka-doncic, jayson-tatum

Note: For now, players must be added manually.
The agent will fetch fresh data via web_search when needed.
`);
  process.exit(1);
}

if (command === 'list') {
  listPlayers();
} else if (command === 'generate') {
  const key = args[1];
  if (!key) {
    console.log('Usage: node add-player.js generate <player-key>');
    process.exit(1);
  }
  generateReport(key);
} else {
  console.log(`Unknown command: ${command}`);
  console.log('Use: list, generate, or enter player name');
}
