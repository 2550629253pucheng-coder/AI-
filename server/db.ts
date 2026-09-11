import fs from "fs";
import path from "path";
import initSqlJs, { Database } from "sql.js";
import { Room, Game, PlayerSecret } from "../src/types/game.js";
import { ThemeTemplate } from "./templates.js";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "game.sqlite");

export class SQLiteStore {
  private static instance: SQLiteStore;
  private db: Database | null = null;
  private initPromise: Promise<void> | null = null;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  public static getInstance(): SQLiteStore {
    if (!SQLiteStore.instance) {
      SQLiteStore.instance = new SQLiteStore();
    }
    return SQLiteStore.instance;
  }

  public async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const SQL = await initSqlJs();
      if (fs.existsSync(DB_FILE)) {
        try {
          const fileBuffer = fs.readFileSync(DB_FILE);
          this.db = new SQL.Database(fileBuffer);
          console.log("[SQLite] Loaded existing database from data/game.sqlite");
        } catch (e) {
          console.warn("[SQLite] Failed to load data/game.sqlite, creating fresh database:", e);
          this.db = new SQL.Database();
        }
      } else {
        this.db = new SQL.Database();
        console.log("[SQLite] Created new SQLite database");
      }

      // 初始化表结构
      this.db.run(`
        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE,
          data TEXT,
          updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS games (
          id TEXT PRIMARY KEY,
          room_id TEXT,
          data TEXT,
          updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS secrets (
          key TEXT PRIMARY KEY,
          data TEXT,
          updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS custom_themes (
          id TEXT PRIMARY KEY,
          data TEXT,
          updated_at INTEGER
        );
      `);

      this.persist();
    })();

    return this.initPromise;
  }

  private schedulePersist() {
    if (this.saveDebounceTimer) return;
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      this.persist();
    }, 500);
  }

  public persist() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, buffer);
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error("[SQLite] Error saving database to disk:", err);
    }
  }

  // ====== 房间操作 ======
  public saveRoom(room: Room): void {
    if (!this.db) return;
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO rooms (id, code, data, updated_at) VALUES (?, ?, ?, ?)`
    );
    stmt.run([room.roomId, room.roomCode, JSON.stringify(room), Date.now()]);
    stmt.free();
    this.schedulePersist();
  }

  public getRoom(roomId: string): Room | null {
    if (!this.db) return null;
    const stmt = this.db.prepare(`SELECT data FROM rooms WHERE id = ?`);
    stmt.bind([roomId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return JSON.parse(row.data as string);
    }
    stmt.free();
    return null;
  }

  public getRoomByCode(code: string): Room | null {
    if (!this.db) return null;
    const stmt = this.db.prepare(`SELECT data FROM rooms WHERE code = ?`);
    stmt.bind([code]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return JSON.parse(row.data as string);
    }
    stmt.free();
    return null;
  }

  public getAllRooms(): Room[] {
    if (!this.db) return [];
    const results = this.db.exec(`SELECT data FROM rooms`);
    if (!results || results.length === 0) return [];
    return results[0].values.map((v) => JSON.parse(v[0] as string));
  }

  // ====== 游戏操作 ======
  public saveGame(game: Game): void {
    if (!this.db) return;
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO games (id, room_id, data, updated_at) VALUES (?, ?, ?, ?)`
    );
    stmt.run([game.gameId, game.roomId, JSON.stringify(game), Date.now()]);
    stmt.free();
    this.schedulePersist();
  }

  public getGame(gameId: string): Game | null {
    if (!this.db) return null;
    const stmt = this.db.prepare(`SELECT data FROM games WHERE id = ?`);
    stmt.bind([gameId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return JSON.parse(row.data as string);
    }
    stmt.free();
    return null;
  }

  // ====== 玩家私密秘密操作 ======
  public saveSecret(gameId: string, playerId: string, secret: PlayerSecret): void {
    if (!this.db) return;
    const key = `${gameId}:${playerId}`;
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO secrets (key, data, updated_at) VALUES (?, ?, ?)`
    );
    stmt.run([key, JSON.stringify(secret), Date.now()]);
    stmt.free();
    this.schedulePersist();
  }

  public getSecret(gameId: string, playerId: string): PlayerSecret | null {
    if (!this.db) return null;
    const key = `${gameId}:${playerId}`;
    const stmt = this.db.prepare(`SELECT data FROM secrets WHERE key = ?`);
    stmt.bind([key]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return JSON.parse(row.data as string);
    }
    stmt.free();
    return null;
  }

  // ====== 自定义与AI沉淀剧本 ======
  public saveTheme(theme: ThemeTemplate): void {
    if (!this.db) return;
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO custom_themes (id, data, updated_at) VALUES (?, ?, ?)`
    );
    stmt.run([theme.themeId, JSON.stringify(theme), Date.now()]);
    stmt.free();
    this.schedulePersist();
  }

  public getAllCustomThemes(): ThemeTemplate[] {
    if (!this.db) return [];
    const results = this.db.exec(`SELECT data FROM custom_themes ORDER BY updated_at DESC`);
    if (!results || results.length === 0) return [];
    return results[0].values.map((v) => JSON.parse(v[0] as string));
  }
}
