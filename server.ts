import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("game.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    hp INTEGER DEFAULT 10,
    max_hp INTEGER DEFAULT 10,
    xp_attack INTEGER DEFAULT 0,
    xp_strength INTEGER DEFAULT 0,
    xp_defence INTEGER DEFAULT 0,
    xp_mining INTEGER DEFAULT 0,
    xp_woodcutting INTEGER DEFAULT 0,
    xp_smithing INTEGER DEFAULT 0,
    gold INTEGER DEFAULT 0,
    location TEXT DEFAULT 'lumbridge_courtyard',
    pos_x INTEGER DEFAULT 10,
    pos_y INTEGER DEFAULT 10
  );
  
  CREATE TABLE IF NOT EXISTS chat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    item_id TEXT,
    quantity INTEGER,
    FOREIGN KEY(player_id) REFERENCES players(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/player/:username", (req, res) => {
    const { username } = req.params;
    let player = db.prepare("SELECT * FROM players WHERE username = ?").get(username);
    
    if (!player) {
      db.prepare("INSERT INTO players (username) VALUES (?)").run(username);
      player = db.prepare("SELECT * FROM players WHERE username = ?").get(username);
    }

    const inventory = db.prepare("SELECT * FROM inventory WHERE player_id = ?").all(player.id);
    res.json({ player, inventory });
  });

  app.post("/api/save", (req, res) => {
    const { username, stats, inventory } = req.body;
    const player = db.prepare("SELECT id FROM players WHERE username = ?").get(username);
    
    if (player) {
      const updateStats = db.prepare(`
        UPDATE players SET 
          hp = ?, max_hp = ?, xp_attack = ?, xp_strength = ?, 
          xp_defence = ?, xp_mining = ?, xp_woodcutting = ?, 
          xp_smithing = ?, gold = ?, location = ?, pos_x = ?, pos_y = ?
        WHERE id = ?
      `);
      updateStats.run(
        stats.hp, stats.max_hp, stats.xp_attack, stats.xp_strength,
        stats.xp_defence, stats.xp_mining, stats.xp_woodcutting,
        stats.xp_smithing, stats.gold, stats.location, stats.pos_x, stats.pos_y, player.id
      );

      // Simple inventory sync: clear and re-insert
      db.prepare("DELETE FROM inventory WHERE player_id = ?").run(player.id);
      const insertItem = db.prepare("INSERT INTO inventory (player_id, item_id, quantity) VALUES (?, ?, ?)");
      for (const item of inventory) {
        insertItem.run(player.id, item.item_id, item.quantity);
      }
    }
    res.json({ success: true });
  });

  // Chat endpoints
  app.get('/api/chat', (req, res) => {
    const messages = db.prepare('SELECT * FROM chat ORDER BY timestamp DESC LIMIT 50').all();
    res.json(messages);
  });

  app.post('/api/chat', (req, res) => {
    const { username, message } = req.body;
    const insert = db.prepare('INSERT INTO chat (username, message) VALUES (?, ?)');
    insert.run(username, message);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
