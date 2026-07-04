import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  readDb,
  writeDb,
  hashPassword,
  createSession,
  getSession,
  destroySession,
  getStorageUsage,
  User,
  CloudGame
} from "./server_db";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Serve custom static uploads folder
  const UPLOADS_DIR = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Initialize database
  readDb();

  // Initialize Gemini API
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }

  // Authorization helper
  const getAuthUser = (req: express.Request): User | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.replace("Bearer ", "").trim();
    return getSession(token);
  };

  // API Routes

  // Auth: Register
  app.post("/api/auth/register", (req, res) => {
    try {
      const { username, password, adminCode } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Nome de usuário e senha são obrigatórios." });
      }

      const trimmedUsername = username.trim().toLowerCase();
      if (trimmedUsername.length < 3) {
        return res.status(400).json({ error: "O nome de usuário deve ter pelo menos 3 caracteres." });
      }

      const db = readDb();
      const exists = db.users.some(u => u.username.toLowerCase() === trimmedUsername);
      if (exists) {
        return res.status(400).json({ error: "Este nome de usuário já está sendo usado." });
      }

      // Check for Admin register code (NETROM_ADMIN_123 or admin)
      const role = (adminCode === "NETROM_ADMIN_123" || adminCode === "admin") ? "admin" : "user";

      const newUser: User = {
        id: `user-${Date.now()}`,
        username: username.trim(),
        passwordHash: hashPassword(password),
        role,
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      writeDb(db);

      const token = createSession(newUser);
      res.json({
        token,
        user: {
          username: newUser.username,
          role: newUser.role
        },
        message: `Conta criada com sucesso como ${role === "admin" ? "Administrador" : "Jogador"}!`
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao registrar usuário." });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
      }

      const db = readDb();
      const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

      if (!user || user.passwordHash !== hashPassword(password)) {
        return res.status(401).json({ error: "Usuário ou senha incorretos." });
      }

      const token = createSession(user);
      res.json({
        token,
        user: {
          username: user.username,
          role: user.role
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao fazer login." });
    }
  });

  // Auth: Me
  app.get("/api/auth/me", (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Sessão inválida ou expirada." });
    }
    res.json({
      username: user.username,
      role: user.role
    });
  });

  // Auth: Logout
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "").trim();
      destroySession(token);
    }
    res.json({ success: true });
  });

  // Cloud Games: List
  app.get("/api/cloud-games", (req, res) => {
    try {
      const db = readDb();
      const storage = getStorageUsage();
      res.json({
        games: db.games,
        storage
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao carregar jogos na nuvem." });
    }
  });

  // Cloud Games: Chunked Download (Bypasses the 32MB Cloud Run payload limit)
  app.get("/api/cloud-games/download-rom-chunk", (req, res) => {
    try {
      const romUrl = req.query.romUrl as string;
      const start = parseInt(req.query.start as string, 10);
      const end = parseInt(req.query.end as string, 10);

      if (!romUrl || isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: "Parâmetros inválidos para download em blocos." });
      }

      // Extract filename safely to prevent path traversal
      const fileName = path.basename(romUrl);
      const filePath = path.join(UPLOADS_DIR, fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Arquivo de ROM não encontrado no servidor." });
      }

      const stats = fs.statSync(filePath);
      const totalSize = stats.size;

      if (start < 0 || end >= totalSize || start > end) {
        return res.status(400).json({ error: `Intervalo de bytes inválido. Tamanho total do arquivo: ${totalSize} bytes.` });
      }

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Length", (end - start + 1).toString());
      res.setHeader("X-File-Size", totalSize.toString());
      res.setHeader("Access-Control-Expose-Headers", "X-File-Size");

      const readStream = fs.createReadStream(filePath, { start, end });
      readStream.pipe(res);
    } catch (err: any) {
      console.error("Erro no download em blocos:", err);
      res.status(500).json({ error: err.message || "Erro interno ao processar download do pedaço." });
    }
  });

  // Admin: Chunked Upload ROM file
  app.post("/api/admin/upload-rom-chunk", (req, res) => {
    try {
      const user = getAuthUser(req);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem fazer upload de ROMs." });
      }

      const filename = req.query.filename as string;
      const chunkIndex = parseInt(req.query.chunkIndex as string, 10);
      const totalChunks = parseInt(req.query.totalChunks as string, 10);
      const uploadId = req.query.uploadId as string;

      if (!filename || isNaN(chunkIndex) || isNaN(totalChunks) || !uploadId) {
        return res.status(400).json({ error: "Parâmetros de chunk ausentes ou inválidos." });
      }

      // Check storage limits
      const { used, total } = getStorageUsage();
      const fileSize = parseInt(req.query.fileSize as string, 10) || 0;
      if (chunkIndex === 0 && used + fileSize > total) {
        return res.status(400).json({
          error: `Erro: O upload deste arquivo (${(fileSize / 1024 / 1024).toFixed(2)} MB) excederia o limite de armazenamento na nuvem de 100 GB. Espaço disponível: ${((total - used) / 1024 / 1024).toFixed(2)} MB.`
        });
      }

      // Create a temporary directory for this upload
      const tempDir = path.join(UPLOADS_DIR, "tmp", uploadId);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);
      const writeStream = fs.createWriteStream(chunkPath);
      req.pipe(writeStream);

      writeStream.on("finish", () => {
        try {
          // Check if all chunks have been uploaded
          const uploadedChunks = fs.readdirSync(tempDir).filter(f => f.startsWith("chunk_"));
          if (uploadedChunks.length === totalChunks) {
            // Assemble all chunks!
            const safeFilename = `${Date.now()}-${path.basename(filename)}`;
            const finalPath = path.join(UPLOADS_DIR, safeFilename);
            const finalWriteStream = fs.createWriteStream(finalPath);

            const appendChunk = (idx: number) => {
              if (idx === totalChunks) {
                finalWriteStream.end();
                return;
              }
              const currentChunkPath = path.join(tempDir, `chunk_${idx}`);
              const readStream = fs.createReadStream(currentChunkPath);
              readStream.pipe(finalWriteStream, { end: false });
              readStream.on("end", () => {
                appendChunk(idx + 1);
              });
              readStream.on("error", (readErr) => {
                console.error(`Read error on chunk ${idx}:`, readErr);
                res.status(500).json({ error: "Falha ao ler pedaço de arquivo para montagem." });
              });
            };

            finalWriteStream.on("finish", () => {
              try {
                // Clean up temp directory
                fs.rmSync(tempDir, { recursive: true, force: true });
                const stats = fs.statSync(finalPath);
                res.json({
                  completed: true,
                  url: `/uploads/${safeFilename}`,
                  fileName: safeFilename,
                  fileSize: stats.size
                });
              } catch (finishErr: any) {
                console.error("Finish handling error:", finishErr);
                res.status(500).json({ error: finishErr.message || "Erro ao concluir montagem da ROM." });
              }
            });

            finalWriteStream.on("error", (writeErr) => {
              console.error("Final write stream error:", writeErr);
              res.status(500).json({ error: "Falha ao gravar arquivo final da ROM." });
            });

            appendChunk(0);
          } else {
            res.json({
              completed: false,
              message: `Chunk ${chunkIndex + 1}/${totalChunks} recebido.`
            });
          }
        } catch (readDirErr: any) {
          console.error("Readdir or processing error:", readDirErr);
          res.status(500).json({ error: readDirErr.message || "Erro ao processar chunks." });
        }
      });

      writeStream.on("error", (err) => {
        console.error("Chunk stream error:", err);
        res.status(500).json({ error: "Falha ao gravar chunk no servidor." });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao processar chunk." });
    }
  });

  // Admin: Stream Upload ROM file
  app.post("/api/admin/upload-rom", (req, res) => {
    try {
      const user = getAuthUser(req);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem fazer upload de ROMs." });
      }

      const filename = req.query.filename as string;
      if (!filename) {
        return res.status(400).json({ error: "Nome do arquivo não fornecido." });
      }

      const contentLength = parseInt(req.headers["content-length"] || "0", 10);
      const { used, total } = getStorageUsage();

      // Check storage limits
      if (used + contentLength > total) {
        return res.status(400).json({
          error: `Erro: O upload deste arquivo (${(contentLength / 1024 / 1024).toFixed(2)} MB) excederia o limite de armazenamento na nuvem de 1 GB. Espaço disponível: ${((total - used) / 1024 / 1024).toFixed(2)} MB.`
        });
      }

      // Sanitize extension
      const ext = path.extname(filename).toLowerCase();
      const allowedExts = [".z64", ".n64", ".v64", ".bin", ".cue", ".iso", ".img", ".zip", ".pbp"];
      if (!allowedExts.includes(ext)) {
        return res.status(400).json({
          error: `Formato de arquivo "${ext}" não suportado. Use formatos retro válidos (.z64, .n64, .v64, .bin, .cue, .iso, .img, .zip, .pbp).`
        });
      }

      const safeFilename = `${Date.now()}-${path.basename(filename)}`;
      const filePath = path.join(UPLOADS_DIR, safeFilename);

      const writeStream = fs.createWriteStream(filePath);
      req.pipe(writeStream);

      writeStream.on("finish", () => {
        const stats = fs.statSync(filePath);
        res.json({
          url: `/uploads/${safeFilename}`,
          fileName: safeFilename,
          fileSize: stats.size
        });
      });

      writeStream.on("error", (err) => {
        console.error("Upload stream error:", err);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        res.status(500).json({ error: "Falha ao gravar a ROM no servidor." });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao processar upload da ROM." });
    }
  });

  // Admin: Add Game Metadata
  app.post("/api/admin/add-game", (req, res) => {
    try {
      const user = getAuthUser(req);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem adicionar jogos à nuvem." });
      }

      const gameData = req.body;
      if (!gameData.title || !gameData.system || !gameData.romUrl) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes: Título, Sistema e ROM URL." });
      }

      const db = readDb();
      
      const newGame: CloudGame = {
        id: `cloud-${Date.now()}`,
        title: gameData.title,
        system: gameData.system,
        genre: gameData.genre || "Retrô",
        year: parseInt(gameData.year) || new Date().getFullYear(),
        rating: gameData.rating || "9.0",
        description: gameData.description || "Adicionado via painel de administração.",
        synopsis: gameData.synopsis || "Sem sinopse detalhada.",
        romUrl: gameData.romUrl,
        coverGradient: gameData.coverGradient || "from-zinc-700 via-slate-800 to-zinc-900",
        isPlayableImmediately: true,
        controls: gameData.controls || [],
        cheats: gameData.cheats || [],
        uploadedBy: user.username,
        fileSize: gameData.fileSize || 0,
        createdAt: new Date().toISOString()
      };

      db.games.push(newGame);
      writeDb(db);

      res.json({
        success: true,
        game: newGame,
        message: "Jogo adicionado com sucesso ao catálogo na nuvem!"
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao adicionar jogo à nuvem." });
    }
  });

  // Admin: Delete Game
  app.delete("/api/admin/delete-game/:id", (req, res) => {
    try {
      const user = getAuthUser(req);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const { id } = req.params;
      const db = readDb();
      const gameIndex = db.games.findIndex(g => g.id === id);

      if (gameIndex === -1) {
        return res.status(404).json({ error: "Jogo não encontrado." });
      }

      const game = db.games[gameIndex];

      // Try to delete file if it belongs to our local uploads
      if (game.romUrl && game.romUrl.startsWith("/uploads/")) {
        const fileName = game.romUrl.replace("/uploads/", "");
        const filePath = path.join(UPLOADS_DIR, fileName);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (fileErr) {
            console.error("Error deleting file:", fileErr);
          }
        }
      }

      db.games.splice(gameIndex, 1);
      writeDb(db);

      res.json({ success: true, message: "Jogo e arquivo ROM excluídos da nuvem com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao excluir jogo." });
    }
  });
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      if (!ai) {
        return res.status(503).json({ 
          error: "O serviço de IA do Gemini não está configurado. Por favor, adicione a chave GEMINI_API_KEY no menu de configurações (Secrets)." 
        });
      }

      const systemInstruction = `Você é o Gemini Co-Pilot do NETROM (a Netflix dos Jogos Retrô), um crítico de jogos clássicos e especialista técnico em Nintendo 64 (Mupen64Plus) e PlayStation 1 (PCSX ReARMed).
Seu trabalho é ajudar e entreter o usuário enquanto ele navega pelo catálogo ou joga clássicos icônicos ou homebrews.
Ofereça respostas ricas, detalhadas, nostálgicas e divertidas em Português:
1. Lore e curiosidades: Detalhe a história de criação de clássicos do N64 (Super Mario 64, Zelda Ocarina of Time, Mario Kart 64, Star Fox 64) e PS1 (Castlevania SOTN, Crash Bandicoot, Resident Evil, Metal Gear Solid, Silent Hill).
2. Dicas e Códigos de Trapaça (Cheats): Forneça walkthroughs, segredos, conquistas secretas e cheats divertidos (GameShark, etc.) do jogo selecionado ou perguntado.
3. Sugestões de Jogos: Se o usuário pedir recomendações ou estiver indeciso, recomende jogos baseados em humor ou preferências (ex: \"quero um jogo de ação no PS1\" ou \"jogo aconchegante\").
4. Suporte de Emulador: Se o usuário tiver dúvidas de como rodar jogos, explique que ele pode arrastar e soltar qualquer arquivo ROM original (.z64/.n64 para Nintendo 64 ou .bin/.cue/.img/.iso/.zip/.pbp para PlayStation 1) diretamente na tela para emular com WebAssembly de verdade!
Use emojis com bom senso e formatação markdown impecável para destacar os títulos dos jogos e subseções.`;

      let fullPrompt = prompt;
      if (context) {
        fullPrompt = `Detalhes de Contexto do Sistema/ROM: ${JSON.stringify(context)}\n\nSolicitação do Usuário: ${prompt}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: fullPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Ocorreu um erro ao processar a resposta da IA." });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
