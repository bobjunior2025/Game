import fs from "fs";
import path from "path";
import crypto from "crypto";

const DB_FILE = path.join(process.cwd(), "db.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface CloudGame {
  id: string;
  title: string;
  system: "n64" | "psx";
  genre: string;
  year: number;
  rating: string;
  description: string;
  synopsis: string;
  romUrl: string; // URL on the server (e.g. /uploads/filename.z64)
  coverGradient: string;
  isPlayableImmediately: boolean;
  controls: string[];
  cheats: string[];
  uploadedBy: string; // username
  fileSize: number; // in bytes
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  games: CloudGame[];
}

// In-memory active sessions
const activeSessions = new Map<string, User>();

// Helper to hash password
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Read database from disk
export function readDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading database file, resetting:", error);
  }

  // Seed default DB if not present
  const defaultDb: DatabaseSchema = {
    users: [
      {
        id: "user-jh-admin",
        username: "jh_admin",
        passwordHash: hashPassword("retro_admin_2026"),
        role: "admin",
        createdAt: new Date().toISOString(),
      },
      {
        id: "user-admin",
        username: "admin",
        passwordHash: hashPassword("admin123"),
        role: "admin",
        createdAt: new Date().toISOString(),
      },
      {
        id: "user-player",
        username: "user",
        passwordHash: hashPassword("user123"),
        role: "user",
        createdAt: new Date().toISOString(),
      },
    ],
    games: [],
  };
  writeDb(defaultDb);
  return defaultDb;
}

// Write database to disk
export function writeDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database to disk:", error);
  }
}

// Session Helpers
export function createSession(user: User): string {
  const token = crypto.randomBytes(32).toString("hex");
  activeSessions.set(token, user);
  return token;
}

export function getSession(token: string): User | null {
  if (!token) return null;
  return activeSessions.get(token) || null;
}

export function destroySession(token: string): void {
  activeSessions.delete(token);
}

// Get directory storage usage (100GB limit)
export function getStorageUsage(): { used: number; total: number; limitReached: boolean } {
  const totalLimit = 100 * 1024 * 1024 * 1024; // 100 GB in bytes
  let usedBytes = 0;

  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          usedBytes += stats.size;
        }
      }
    }
  } catch (error) {
    console.error("Error calculating storage usage:", error);
  }

  return {
    used: usedBytes,
    total: totalLimit,
    limitReached: usedBytes >= totalLimit,
  };
}
