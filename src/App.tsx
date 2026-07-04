/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Gamepad, 
  Search, 
  Sparkles, 
  Heart, 
  Terminal, 
  Trash2, 
  Play, 
  Info, 
  Plus, 
  Check, 
  UploadCloud, 
  HelpCircle, 
  Cpu, 
  Tv, 
  ExternalLink,
  Database,
  Volume2,
  VolumeX,
  X,
  Compass,
  ListVideo,
  User,
  Lock,
  Shield,
  HardDrive,
  Cloud,
  LogOut,
  Loader2
} from "lucide-react";
import { Game, GAMES_CATALOG } from "./data/games";
import GamePlayground from "./components/GamePlayground";
import AIPanel from "./components/AIPanel";
import GamepadConfigurator from "./components/GamepadConfigurator";
import { ConsoleLog } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { cacheRom, getCachedRom, clearCachedRom, getLocalCacheSize, clearAllLocalCache } from "./lib/clientDb";

export default function App() {
  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<"tudo" | "n64" | "psx" | "favoritos" | "enviados" | "nuvem" | "admin">("tudo");
  const [searchTerm, setSearchTerm] = useState("");
  
  // User Auth States
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("netrom-token"));
  const [user, setUser] = useState<{ username: string; role: "user" | "admin" } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authIsRegister, setAuthIsRegister] = useState(false);
  const [authAdminCode, setAuthAdminCode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Cloud Games Storage
  const [cloudGames, setCloudGames] = useState<Game[]>([]);
  const [cloudStorage, setCloudStorage] = useState<{ used: number; total: number; limitReached: boolean } | null>(null);
  const [loadingCloudGames, setLoadingCloudGames] = useState(false);
  const [localCacheSize, setLocalCacheSize] = useState<number>(0);

  // Admin Panel Form States
  const [adminTitle, setAdminTitle] = useState("");
  const [adminSystem, setAdminSystem] = useState<"n64" | "psx">("n64");
  const [adminGenre, setAdminGenre] = useState("");
  const [adminYear, setAdminYear] = useState(1998);
  const [adminRating, setAdminRating] = useState("9.0");
  const [adminDescription, setAdminDescription] = useState("");
  const [adminSynopsis, setAdminSynopsis] = useState("");
  const [adminCoverGradient, setAdminCoverGradient] = useState("from-zinc-700 via-slate-800 to-zinc-900");
  const [adminControls, setAdminControls] = useState("");
  const [adminCheats, setAdminCheats] = useState("");
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [uploadingRom, setUploadingRom] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  // Downloading State for Playing Cloud Games
  const [downloadingGameId, setDownloadingGameId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Game Library States
  const [favorites, setFavorites] = useState<string[]>([]);
  const [uploadedGames, setUploadedGames] = useState<Game[]>([]);
  
  // Player & Details Modal States
  const [activePlayingGame, setActivePlayingGame] = useState<Game | null>(null);
  const [selectedDetailsGame, setSelectedDetailsGame] = useState<Game | null>(null);
  const [featuredGame, setFeaturedGame] = useState<Game>(GAMES_CATALOG[0]);
  
  // Global settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDeveloperLogs, setShowDeveloperLogs] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showGamepadConfigurator, setShowGamepadConfigurator] = useState(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);

  // Monitor Gamepad connection status in header
  useEffect(() => {
    const checkGamepads = () => {
      const list = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
      setGamepadConnected(list.length > 0);
    };
    window.addEventListener("gamepadconnected", checkGamepads);
    window.addEventListener("gamepaddisconnected", checkGamepads);
    checkGamepads();
    return () => {
      window.removeEventListener("gamepadconnected", checkGamepads);
      window.removeEventListener("gamepaddisconnected", checkGamepads);
    };
  }, []);
  
  // Diagnostics Console Logs
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([
    { timestamp: "14:00:00", module: "SYS", message: "NETROM Streaming Engine v2.0 inicializada.", type: "success" },
    { timestamp: "14:00:01", module: "SYS", message: "Módulos de aceleração WebAssembly de emulação prontos (Mupen64 + PCSX).", type: "info" },
    { timestamp: "14:00:02", module: "AI", message: "Gemini AI Retro Co-Pilot conectado e pronto para auxiliar.", type: "success" },
  ]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Load favorites & uploaded game details on mount
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem("netrom-favorites");
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
      
      const savedRoms = localStorage.getItem("netrom-uploaded-rom-details");
      if (savedRoms) {
        // Since blobs are temporary, we can reconstruct the catalog cards, 
        // but tell them to upload the file again to play.
        const parsed: Game[] = JSON.parse(savedRoms);
        const reconstructed = parsed.map(g => ({
          ...g,
          romUrl: undefined // Requires re-upload to actually play
        }));
        setUploadedGames(reconstructed);
      }
    } catch (e) {
      console.warn("Erro ao carregar do localStorage:", e);
    }

    // Set a random gorgeous featured game on load (e.g. Castlevania or Mario 64)
    const candidates = GAMES_CATALOG.filter(g => g.id === "castlevaniasotn" || g.id === "mario64" || g.id === "zeldaoot");
    if (candidates.length > 0) {
      setFeaturedGame(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }, []);

  // Sync token to localStorage and fetch user profile
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setUser(null);
        return;
      }
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          addLog("SYS", `Sessão restaurada para "${data.username}" (${data.role === "admin" ? "Administrador" : "Jogador"}).`, "success");
        } else {
          setToken(null);
          localStorage.removeItem("netrom-token");
          setUser(null);
        }
      } catch (err) {
        console.error("Auth restoration error:", err);
      }
    };
    fetchUser();
  }, [token]);

  // Sync token value with localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem("netrom-token", token);
    } else {
      localStorage.removeItem("netrom-token");
    }
  }, [token]);

  // Fetch Cloud Games catalog from database
  const fetchCloudGames = useCallback(async () => {
    setLoadingCloudGames(true);
    try {
      const res = await fetch("/api/cloud-games");
      if (res.ok) {
        const data = await res.json();
        setCloudGames(data.games || []);
        setCloudStorage(data.storage);
      }
    } catch (err) {
      console.error("Error fetching cloud games:", err);
    } finally {
      setLoadingCloudGames(false);
    }
  }, []);

  useEffect(() => {
    fetchCloudGames();
    // Update local cache size on load
    const updateCacheSize = async () => {
      try {
        const size = await getLocalCacheSize();
        setLocalCacheSize(size);
      } catch (e) {
        console.warn("Could not retrieve cache size:", e);
      }
    };
    updateCacheSize();
  }, [fetchCloudGames]);

  // Auth: Submit Login / Registration
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    playBeep();

    const endpoint = authIsRegister ? "/api/auth/register" : "/api/auth/login";
    const body = authIsRegister 
      ? { username: authUsername, password: authPassword, adminCode: authAdminCode }
      : { username: authUsername, password: authPassword };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        addLog("SYS", `Login efetuado com sucesso como "${data.user.username}"!`, "success");
        setShowLoginModal(false);
        setAuthUsername("");
        setAuthPassword("");
        setAuthAdminCode("");
      } else {
        setAuthError(data.error || "Falha na autenticação.");
      }
    } catch (err: any) {
      setAuthError("Erro de conexão com o servidor.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Logout
  const handleLogout = async () => {
    playBeep();
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    setToken(null);
    setUser(null);
    setActiveTab("tudo");
    addLog("SYS", "Sessão encerrada com sucesso.", "info");
  };

  // Cloud Game Caching Player using client-side IndexedDB
  const playCloudGame = async (game: Game) => {
    if (!game.romUrl) return;

    // Check client-side IndexedDB cache first
    try {
      const cachedBlob = await getCachedRom(game.id);
      if (cachedBlob) {
        const localBlobUrl = URL.createObjectURL(cachedBlob);
        setActivePlayingGame({
          ...game,
          romUrl: localBlobUrl
        });
        addLog("SYS", `Jogo na nuvem "${game.title}" carregado instantaneamente do cache local IndexedDB (Sem baixar!).`, "success");
        return;
      }
    } catch (e) {
      console.warn("IndexedDB cache check failed:", e);
    }

    // Download & Cache via robust chunked fetching to bypass server payload limits (32MB)
    setDownloadingGameId(game.id);
    setDownloadProgress(0);
    addLog("SYS", `Iniciando download em blocos de "${game.title}" para o cache local do seu navegador (IndexedDB)...`, "info");

    try {
      // Step 1: Query ROM file size using a 1-byte meta request to the chunked endpoint
      const headRes = await fetch(`/api/cloud-games/download-rom-chunk?romUrl=${encodeURIComponent(game.romUrl)}&start=0&end=0`);
      if (!headRes.ok) throw new Error("Erro ao consultar tamanho da ROM no servidor.");
      
      const totalSize = parseInt(headRes.headers.get("X-File-Size") || "0", 10);
      if (!totalSize) throw new Error("Não foi possível determinar o tamanho total da ROM.");

      const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks to stay safely below 32MB limit
      const chunks: Uint8Array[] = [];
      let bytesDownloaded = 0;

      while (bytesDownloaded < totalSize) {
        const start = bytesDownloaded;
        const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
        
        const chunkRes = await fetch(
          `/api/cloud-games/download-rom-chunk?romUrl=${encodeURIComponent(game.romUrl)}&start=${start}&end=${end}`
        );

        if (!chunkRes.ok) {
          throw new Error(`Erro ao baixar bloco da ROM (${start}-${end}).`);
        }

        const chunkBuffer = await chunkRes.arrayBuffer();
        chunks.push(new Uint8Array(chunkBuffer));
        bytesDownloaded += chunkBuffer.byteLength;

        const progress = Math.min(100, Math.round((bytesDownloaded / totalSize) * 100));
        setDownloadProgress(progress);
      }

      // Step 2: Combine chunks efficiently into a single Blob
      const romBlob = new Blob(chunks, { type: "application/octet-stream" });
      await cacheRom(game.id, romBlob);
      const localBlobUrl = URL.createObjectURL(romBlob);

      setActivePlayingGame({
        ...game,
        romUrl: localBlobUrl
      });
      
      const size = await getLocalCacheSize();
      setLocalCacheSize(size);
      
      addLog("SYS", `Download concluído e gravado com sucesso no IndexedDB! Próximas vezes iniciarão instantaneamente.`, "success");
    } catch (err: any) {
      console.error("Cloud game load error:", err);
      addLog("SYS", `Falha no download em blocos. Iniciando "${game.title}" via streaming direto...`, "warning");
      setActivePlayingGame(game);
    } finally {
      setDownloadingGameId(null);
    }
  };

  // Admin: Submit a new cloud game to backend
  const handleAdminAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminSuccess(null);
    playBeep();

    if (!adminTitle || !adminGenre || !adminFile) {
      setAdminError("Título, Gênero e o arquivo da ROM são campos obrigatórios.");
      return;
    }

    setUploadingRom(true);
    addLog("SYS", `Iniciando upload de "${adminFile.name}" (${(adminFile.size / 1024 / 1024).toFixed(2)} MB)...`, "info");

    try {
      // Step 1: Upload ROM file in chunks
      const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB per chunk
      const totalChunks = Math.ceil(adminFile.size / CHUNK_SIZE);
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      let uploadResult: any = null;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, adminFile.size);
        const chunkBlob = adminFile.slice(start, end);

        addLog("SYS", `Enviando "${adminFile.name}": Parte ${i + 1} de ${totalChunks} (${Math.round((i / totalChunks) * 100)}%)...`, "info");

        const chunkRes = await fetch(
          `/api/admin/upload-rom-chunk?filename=${encodeURIComponent(adminFile.name)}&chunkIndex=${i}&totalChunks=${totalChunks}&uploadId=${uploadId}&fileSize=${adminFile.size}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: chunkBlob
          }
        );

        if (!chunkRes.ok) {
          const chunkData = await chunkRes.json();
          throw new Error(chunkData.error || `Erro ao enviar a parte ${i + 1} da ROM.`);
        }

        const chunkData = await chunkRes.json();
        if (chunkData.completed) {
          uploadResult = chunkData;
        }
      }

      if (!uploadResult) {
        throw new Error("Erro de processamento: O upload não foi concluído pelo servidor.");
      }

      addLog("SYS", `Arquivo ROM gravado com sucesso na nuvem: "${uploadResult.fileName}"`, "success");

      // Step 2: Register Game Metadata
      const gamePayload = {
        title: adminTitle,
        system: adminSystem,
        genre: adminGenre,
        year: adminYear,
        rating: adminRating,
        description: adminDescription || `Jogo de ${adminSystem === "n64" ? "Nintendo 64" : "PlayStation 1"} adicionado por administrador.`,
        synopsis: adminSynopsis || "Não há sinopse detalhada disponível.",
        romUrl: uploadResult.url,
        coverGradient: adminCoverGradient,
        fileSize: uploadResult.fileSize,
        controls: adminControls ? adminControls.split("\n").map(c => c.trim()).filter(Boolean) : [
          adminSystem === "n64"
            ? "Analógico ou WASD: Mover | Botão A: Pular | Botão B: Ação | Start: Menu"
            : "Setas ou WASD: Mover | Botão X: Pular | Botão Quadrado: Ação | Start: Menu"
        ],
        cheats: adminCheats ? adminCheats.split("\n").map(c => c.trim()).filter(Boolean) : ["Nenhum código de cheat cadastrado. Sinta-se à livre para pedir dicas ao Gemini!"]
      };

      const metaRes = await fetch("/api/admin/add-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(gamePayload)
      });

      const metaData = await metaRes.json();
      if (!metaRes.ok) {
        throw new Error(metaData.error || "Erro ao registrar informações no catálogo.");
      }

      setAdminSuccess("Jogo adicionado à nuvem e catalogado com sucesso!");
      addLog("SYS", `Jogo "${adminTitle}" foi integrado com sucesso ao catálogo coletivo!`, "success");

      // Clear Form Fields
      setAdminTitle("");
      setAdminGenre("");
      setAdminDescription("");
      setAdminSynopsis("");
      setAdminControls("");
      setAdminCheats("");
      setAdminFile(null);

      // Refresh cloud lists
      fetchCloudGames();
    } catch (err: any) {
      setAdminError(err.message || "Ocorreu um erro ao adicionar o jogo.");
      addLog("SYS", `Falha ao integrar jogo na nuvem: ${err.message}`, "error");
    } finally {
      setUploadingRom(false);
    }
  };

  // Admin: Delete game and ROM
  const handleAdminDeleteGame = async (gameId: string, gameTitle: string) => {
    if (!window.confirm(`Tem certeza que deseja remover permanentemente o jogo "${gameTitle}" da nuvem?`)) {
      return;
    }
    playBeep();
    try {
      const res = await fetch(`/api/admin/delete-game/${gameId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        addLog("SYS", `Jogo "${gameTitle}" e seu arquivo ROM correspondente foram removidos da nuvem.`, "warning");
        fetchCloudGames();
      } else {
        alert(data.error || "Falha ao deletar jogo.");
      }
    } catch (err: any) {
      console.error("Delete game error:", err);
    }
  };

  // Client Cache Clear
  const handleClearClientCache = async () => {
    if (!window.confirm("Deseja mesmo limpar todo o cache local do IndexedDB?")) {
      return;
    }
    playBeep();
    try {
      await clearAllLocalCache();
      setLocalCacheSize(0);
      addLog("SYS", "Cache local do IndexedDB foi limpo com sucesso.", "info");
    } catch (e) {
      console.error("Clear cache failed:", e);
    }
  };

  // Sync favorites to localStorage
  const toggleFavorite = (gameId: string) => {
    playBeep();
    let nextFavs: string[];
    if (favorites.includes(gameId)) {
      nextFavs = favorites.filter(id => id !== gameId);
      addLog("SYS", `Jogo removido da sua lista de favoritos.`, "warning");
    } else {
      nextFavs = [...favorites, gameId];
      addLog("SYS", `Jogo adicionado à sua lista de favoritos!`, "success");
    }
    setFavorites(nextFavs);
    localStorage.setItem("netrom-favorites", JSON.stringify(nextFavs));
  };

  // Sound synthesis helpers
  const playSynth = (freqs: number[], durations: number[], type: OscillatorType = "sine") => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      let startTime = ctx.currentTime;
      freqs.forEach((freq, index) => {
        const dur = durations[index];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.04, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + dur);
        startTime += dur * 0.8;
      });
    } catch (e) {
      console.warn("Erro de sintetizador de som:", e);
    }
  };

  const playBeep = () => playSynth([600], [0.08]);
  const playClack = () => playSynth([220, 110], [0.04, 0.03], "triangle");
  const playPowerOn = () => playSynth([330, 440, 554, 660], [0.08, 0.08, 0.08, 0.25]);

  const addLog = useCallback((
    module: "CPU" | "RSP" | "RDP" | "VI" | "SYS" | "AI",
    message: string,
    type: "info" | "warning" | "success" | "error" = "info"
  ) => {
    const now = new Date();
    const ts = now.toTimeString().split(" ")[0];
    setConsoleLogs((prev) => [
      ...prev,
      { timestamp: ts, module, message, type },
    ]);
  }, []);

  // Parsing ROM uploads dynamically
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleRomFile(file);
    }
  };

  const handleRomFile = (file: File) => {
    playPowerOn();
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Detect system
    let system: "n64" | "psx" = "n64";
    if (extension && ["bin", "cue", "iso", "img", "zip", "pbp"].includes(extension)) {
      system = "psx";
    }

    const newId = `uploaded-${Date.now()}`;
    const blobUrl = URL.createObjectURL(file);

    const newGame: Game = {
      id: newId,
      title: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
      system,
      genre: "ROM Importada",
      year: new Date().getFullYear(),
      rating: "ROM",
      description: `Sua própria ROM local do jogo (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
      synopsis: `Esta ROM foi importada localmente e está sendo emulada no core WASM de ${system === "n64" ? "Nintendo 64 (Mupen64Plus)" : "PlayStation 1 (PCSX ReARMed)"}. Nome do arquivo: ${file.name}. Tamanho total: ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
      coverGradient: system === "n64" ? "from-purple-900 via-indigo-950 to-black" : "from-blue-900 via-slate-950 to-black",
      isPlayableImmediately: true,
      romUrl: blobUrl,
      controls: system === "n64"
        ? ["Teclas de Direção ou WASD: Analógico", "Botão A ou Barra de Espaço: Pular / Ação", "Botão B ou J: Ação", "Enter / Start: Menu"]
        : ["Teclas de Direção ou WASD: Mover", "Botão X ou Barra de Espaço: Pular / Confirmar", "Botão Quadrado ou J: Ação", "Enter / Start: Menu"],
      cheats: ["Para ROMs enviadas, consulte cheats clássicos na internet ou pergunte ao Gemini Co-Pilot ao lado!"]
    };

    const nextUploaded = [newGame, ...uploadedGames];
    setUploadedGames(nextUploaded);
    
    // Persist details to localStorage (excluding blobUrl which is temporary)
    const persistedDetails = nextUploaded.map(g => ({ ...g, romUrl: undefined }));
    localStorage.setItem("netrom-uploaded-rom-details", JSON.stringify(persistedDetails));

    addLog("SYS", `ROM de ${system.toUpperCase()} inserida: "${file.name}" - Pronto para rodar!`, "success");
    
    // Automatically play
    setActivePlayingGame(newGame);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleRomFile(e.dataTransfer.files[0]);
    }
  };

  // Handle playing custom catalog game that requires upload
  const handlePlayCatalogGame = (game: Game) => {
    playBeep();
    if (game.isPlayableImmediately) {
      if (game.id.startsWith("cloud-")) {
        playCloudGame(game);
      } else {
        setActivePlayingGame(game);
        addLog("SYS", `Iniciando jogo: ${game.title}`, "success");
      }
    } else {
      // Prompt user to upload ROM for this game
      setSelectedDetailsGame(game);
      addLog("SYS", `Jogo comercial selecionado: "${game.title}". Para respeitar direitos autorais, envie seu arquivo .z64/.n64 ou .bin/.cue para jogar!`, "warning");
    }
  };

  // List of all games combined (default + uploaded + cloud)
  const allGames = [...uploadedGames, ...cloudGames, ...GAMES_CATALOG];

  // Filtering games based on tabs and search term
  const filteredGames = allGames.filter((game) => {
    const matchesSearch = 
      game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.genre.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      activeTab === "tudo" ||
      (activeTab === "n64" && game.system === "n64") ||
      (activeTab === "psx" && game.system === "psx") ||
      (activeTab === "favoritos" && favorites.includes(game.id)) ||
      (activeTab === "enviados" && game.id.startsWith("uploaded-")) ||
      (activeTab === "nuvem" && game.id.startsWith("cloud-"));

    return matchesSearch && matchesTab;
  });

  return (
    <div 
      className="min-h-screen bg-zinc-950 text-gray-100 font-sans flex flex-col relative selection:bg-red-600 selection:text-white"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {/* Red Ambient Glow on top (Netflix-style) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-gradient-to-b from-red-600/10 via-transparent to-transparent pointer-events-none z-0" />

      {/* Global Drag and Drop Overlay */}
      {dragActive && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md border-4 border-dashed border-red-600 z-50 flex flex-col items-center justify-center p-6 text-center animate-pulse pointer-events-none">
          <UploadCloud className="w-20 h-20 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2 uppercase">
            Solte sua ROM aqui!
          </h2>
          <p className="text-zinc-400 max-w-md text-sm leading-relaxed">
            Suporta <strong className="text-purple-400">Nintendo 64</strong> (.z64, .n64) e <strong className="text-blue-400">PlayStation 1</strong> (.bin, .cue, .iso, .img, .zip, .pbp). O emulador abrirá instantaneamente!
          </p>
        </div>
      )}

      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-900/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-extrabold tracking-tighter text-red-600 cursor-pointer select-none font-mono flex items-center gap-1.5" onClick={() => { playBeep(); setActiveTab("tudo"); }}>
              NETROM
              <span className="text-[10px] bg-red-600/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold font-sans">
                STREAMING
              </span>
            </h1>

            {/* Nav Links */}
            <nav className="hidden xl:flex items-center gap-4 text-xs font-medium text-zinc-400">
              <button 
                onClick={() => { playClack(); setActiveTab("tudo"); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeTab === "tudo" ? "text-white font-bold" : ""}`}
              >
                Início
              </button>
              <button 
                onClick={() => { playClack(); setActiveTab("n64"); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeTab === "n64" ? "text-white font-bold text-purple-400" : ""}`}
              >
                Nintendo 64
              </button>
              <button 
                onClick={() => { playClack(); setActiveTab("psx"); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeTab === "psx" ? "text-white font-bold text-blue-400" : ""}`}
              >
                PlayStation 1
              </button>
              <button 
                onClick={() => { playClack(); setActiveTab("nuvem"); }}
                className={`transition-colors hover:text-white cursor-pointer flex items-center gap-1 ${activeTab === "nuvem" ? "text-white font-bold text-red-500" : ""}`}
              >
                <Cloud className="w-3.5 h-3.5" />
                Jogos na Nuvem ({cloudGames.length})
              </button>
              <button 
                onClick={() => { playClack(); setActiveTab("favoritos"); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeTab === "favoritos" ? "text-white font-bold" : ""}`}
              >
                Minha Lista ({favorites.length})
              </button>
              <button 
                onClick={() => { playClack(); setActiveTab("enviados"); }}
                className={`transition-colors hover:text-white cursor-pointer ${activeTab === "enviados" ? "text-white font-bold" : ""}`}
              >
                Meus Envios ({uploadedGames.length})
              </button>
              {user?.role === "admin" && (
                <button 
                  onClick={() => { playClack(); setActiveTab("admin"); }}
                  className={`transition-all hover:text-white cursor-pointer px-2.5 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center gap-1 font-bold ${activeTab === "admin" ? "bg-yellow-500/25 text-white" : ""}`}
                >
                  <Shield className="w-3 h-3" />
                  Painel Admin
                </button>
              )}
            </nav>
          </div>

          {/* Search, Upload & Global Actions */}
          <div className="flex items-center gap-3 flex-1 md:flex-initial justify-end">
            
            {/* Elegant Search Input */}
            <div className="relative w-full max-w-[120px] sm:max-w-[180px]">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar jogos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all"
              />
            </div>

            {/* Quick ROM Upload button */}
            <div className="relative group">
              <input
                type="file"
                id="header-rom-upload"
                onChange={handleFileUpload}
                accept=".z64,.n64,.bin,.cue,.img,.iso,.zip"
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
              <button className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold p-2 sm:px-3 sm:py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 cursor-pointer">
                <UploadCloud className="w-4 h-4 text-red-500" />
                <span className="hidden sm:inline">Enviar ROM</span>
              </button>
            </div>

            {/* Controller Settings Toggle */}
            <button
              onClick={() => { playBeep(); setShowGamepadConfigurator(true); }}
              className="relative p-2 rounded-full border bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-red-500 transition-colors cursor-pointer"
              title="Configurar Controle Bluetooth / USB"
            >
              <Gamepad className="w-4 h-4" />
              {gamepadConnected && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
              )}
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => { playBeep(); setSoundEnabled(!soundEnabled); }}
              className={`p-2 rounded-full border transition-colors cursor-pointer ${
                soundEnabled
                  ? "bg-zinc-900 border-zinc-800 text-red-500 hover:bg-zinc-800"
                  : "bg-zinc-950 border-zinc-900 text-zinc-600 hover:text-zinc-400"
              }`}
              title={soundEnabled ? "Desativar Sons" : "Ativar Sons"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Profile & Auth Menu button */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-850 rounded-full pl-3 pr-1 py-1 text-xs">
                <span className="text-zinc-300 font-bold font-sans flex items-center gap-1 max-w-[80px] sm:max-w-[120px] truncate">
                  {user.role === "admin" ? <Shield className="w-3.5 h-3.5 text-yellow-500 shrink-0" /> : <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                  {user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-zinc-800 hover:bg-zinc-700 hover:text-red-500 text-zinc-400 p-1 rounded-full transition-colors cursor-pointer"
                  title="Sair"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { playBeep(); setShowLoginModal(true); }}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1 cursor-pointer hover:shadow-lg hover:shadow-red-600/10 active:scale-95"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body content */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col gap-8 z-10">

        {/* Dynamic Theater / Immersive Active Emulator player */}
        <AnimatePresence mode="wait">
          {activePlayingGame && (
            <motion.div
              key="game-theater"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-4 backdrop-blur-md shadow-2xl relative overflow-hidden"
            >
              {/* Decorative top red thin laser line */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600" />

              {/* Theater Column: Game Screen & Guides (Col span 8) */}
              <div className="lg:col-span-8 flex flex-col h-full gap-3">
                <GamePlayground
                  activeGame={activePlayingGame}
                  customRomUrl={activePlayingGame.romUrl}
                  customRomName={activePlayingGame.id.startsWith("uploaded-") ? activePlayingGame.title : undefined}
                  onClose={() => {
                    setActivePlayingGame(null);
                    addLog("SYS", "Sessão de jogo finalizada.", "info");
                  }}
                  onAddLog={addLog}
                  soundEnabled={soundEnabled}
                  setSoundEnabled={setSoundEnabled}
                  playBeep={playBeep}
                />
              </div>

              {/* Chat Column: Gemini AI Game Companion (Col span 4) */}
              <div className="lg:col-span-4 flex flex-col h-full min-h-[380px] lg:min-h-0">
                <AIPanel
                  activeGame={activePlayingGame}
                  soundEnabled={soundEnabled}
                  playBeep={playBeep}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Billboard / Banner - Only visible if not actively playing, or searching, and on Início tab */}
        {!activePlayingGame && !searchTerm && activeTab === "tudo" && (
          <div className="relative w-full aspect-[21/9] min-h-[220px] rounded-3xl overflow-hidden border border-zinc-800/60 shadow-2xl group bg-black">
            
            {/* Breathtaking gradient background representing the game */}
            <div className={`absolute inset-0 bg-gradient-to-r ${featuredGame.coverGradient} opacity-90 transition-all duration-700`} />
            
            {/* Cinema light overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/45 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/20 to-transparent z-10" />

            {/* Hero content container */}
            <div className="absolute inset-0 z-20 p-6 sm:p-10 flex flex-col justify-end max-w-xl gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase font-mono tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                  ★ RECOMENDADO
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  featuredGame.system === "n64"
                    ? "bg-purple-950/50 border-purple-800/40 text-purple-400"
                    : "bg-blue-950/50 border-blue-800/40 text-blue-400"
                }`}>
                  {featuredGame.system.toUpperCase()}
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white uppercase font-sans">
                {featuredGame.title}
              </h2>

              <p className="text-2xs sm:text-xs text-zinc-300 leading-relaxed font-sans line-clamp-2">
                {featuredGame.description}
              </p>

              <div className="flex items-center gap-3 text-3xs sm:text-2xs font-semibold text-zinc-400">
                <span className="text-yellow-400">★ {featuredGame.rating}</span>
                <span>•</span>
                <span>{featuredGame.year}</span>
                <span>•</span>
                <span>{featuredGame.genre}</span>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handlePlayCatalogGame(featuredGame)}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-full text-xs tracking-wider transition-all shadow-lg hover:shadow-red-600/25 flex items-center gap-1.5 cursor-pointer uppercase"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> Jogar
                </button>
                <button
                  onClick={() => { playBeep(); setSelectedDetailsGame(featuredGame); }}
                  className="bg-zinc-800/80 hover:bg-zinc-700 text-white font-semibold py-2 px-6 rounded-full text-xs transition-all border border-zinc-700/50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" /> Detalhes
                </button>
                <button
                  onClick={() => toggleFavorite(featuredGame.id)}
                  className={`p-2 rounded-full border transition-all cursor-pointer ${
                    favorites.includes(featuredGame.id)
                      ? "bg-red-950/20 border-red-500 text-red-500"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                  title="Salvar na minha lista"
                >
                  <Heart className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hover details badge inside banner right */}
            <div className="absolute right-8 bottom-8 hidden lg:block z-20 text-right bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/40 backdrop-blur-md">
              <p className="text-3xs text-zinc-400 uppercase font-mono">Dispositivo Recomendado</p>
              <p className="text-xs font-bold text-zinc-200">Suporte a Controle Ativo</p>
              <p className="text-[10px] text-zinc-400 font-mono mt-1">Plugue um controle USB para jogar</p>
            </div>
          </div>
        )}

        {/* Section categories / tabs filter on mobile */}
        <div className="flex xl:hidden items-center gap-1 overflow-x-auto pb-1 bg-zinc-900/20 p-1 rounded-xl border border-zinc-900">
          {(([
            "tudo", 
            "n64", 
            "psx", 
            "nuvem", 
            "favoritos", 
            "enviados",
            ...(user?.role === "admin" ? ["admin" as const] : [])
          ]) as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { playClack(); setActiveTab(tab); }}
              className={`px-3 py-1.5 rounded-lg text-2xs font-medium uppercase tracking-wider shrink-0 transition-all ${
                activeTab === tab
                  ? "bg-red-600 text-white font-bold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab === "psx" ? "PS1" : tab === "nuvem" ? "Nuvem" : tab}
            </button>
          ))}
        </div>

        {/* Shelf Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <h3 className="text-sm font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-2 font-mono">
            <Compass className="w-4 h-4 text-red-500" />
            {activeTab === "tudo" && "Catálogo Completo"}
            {activeTab === "n64" && "Clássicos do Nintendo 64"}
            {activeTab === "psx" && "Clássicos do PlayStation 1"}
            {activeTab === "nuvem" && "Jogos Coletivos Armazenados na Nuvem"}
            {activeTab === "favoritos" && "Sua Lista Especial"}
            {activeTab === "enviados" && "ROMs Enviadas por Você"}
            {activeTab === "admin" && "Gerenciamento de Jogos na Nuvem (Painel Admin)"}
            {searchTerm && `• Resultados para: "${searchTerm}"`}
          </h3>
          <span className="text-3xs text-zinc-500 font-mono">
            {filteredGames.length} {filteredGames.length === 1 ? "jogo encontrado" : "jogos encontrados"}
          </span>
        </div>

        {/* Cloud ROM download progress overlay banner */}
        {downloadingGameId && (
          <div className="bg-gradient-to-r from-red-600/20 via-red-900/10 to-zinc-950/40 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse mb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-red-500 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Baixando ROM do Servidor Coletivo...</p>
                <p className="text-3xs text-zinc-400">Esta ROM está sendo salva no seu banco de dados IndexedDB local para carregar instantaneamente na próxima vez!</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="h-2.5 bg-zinc-800 rounded-full w-full sm:w-[200px] overflow-hidden">
                <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
              </div>
              <span className="text-2xs font-bold text-red-400 font-mono shrink-0">{downloadProgress}%</span>
            </div>
          </div>
        )}

        {/* Main Grid display or Admin Panel */}
        {activeTab === "admin" ? (
          user?.role === "admin" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Form Column */}
              <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl backdrop-blur-md space-y-6">
                <div>
                  <h4 className="text-md font-bold text-white flex items-center gap-2 font-sans">
                    <Plus className="w-5 h-5 text-red-500" /> Catalogar Novo Jogo na Nuvem
                  </h4>
                  <p className="text-3xs text-zinc-500 mt-1 font-mono">Carregue um arquivo ROM original de Nintendo 64 ou PS1 para que todos os usuários possam jogar via streaming sem download!</p>
                </div>

                <form onSubmit={handleAdminAddGame} className="space-y-4">
                  {adminError && <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-red-400 text-2xs font-semibold">{adminError}</div>}
                  {adminSuccess && <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-400 text-2xs font-semibold">{adminSuccess}</div>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-3xs text-zinc-400 font-mono uppercase font-bold">Título do Jogo</label>
                      <input 
                        type="text" 
                        required
                        value={adminTitle}
                        onChange={(e) => setAdminTitle(e.target.value)}
                        placeholder="Ex: Super Smash Bros."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-3xs text-zinc-400 font-mono uppercase font-bold">Gênero</label>
                      <input 
                        type="text" 
                        required
                        value={adminGenre}
                        onChange={(e) => setAdminGenre(e.target.value)}
                        placeholder="Ex: Luta / Ação"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-3xs text-zinc-400 font-mono uppercase font-bold">Plataforma</label>
                      <select 
                        value={adminSystem}
                        onChange={(e) => setAdminSystem(e.target.value as "n64" | "psx")}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                      >
                        <option value="n64">Nintendo 64</option>
                        <option value="psx">PlayStation 1</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-3xs text-zinc-400 font-mono uppercase font-bold">Ano de Lançamento</label>
                      <input 
                        type="number" 
                        required
                        value={adminYear}
                        onChange={(e) => setAdminYear(parseInt(e.target.value) || 1998)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-3xs text-zinc-400 font-mono uppercase font-bold">Avaliação (Rating)</label>
                      <input 
                        type="text" 
                        required
                        value={adminRating}
                        onChange={(e) => setAdminRating(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-3xs text-zinc-400 font-mono uppercase font-bold">Tema Visual (Cover Gradient)</label>
                    <select 
                      value={adminCoverGradient}
                      onChange={(e) => setAdminCoverGradient(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                    >
                      <option value="from-red-900 via-zinc-950 to-black">Carmesim Flamejante (Red)</option>
                      <option value="from-purple-900 via-indigo-950 to-black">Nebulosa Violeta (Purple)</option>
                      <option value="from-blue-900 via-slate-950 to-black">Abismo Cósmico (Blue)</option>
                      <option value="from-emerald-900 via-teal-950 to-black">Floresta Élfica (Green)</option>
                      <option value="from-zinc-700 via-slate-800 to-zinc-900">Metal Escovado (Gray)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-3xs text-zinc-400 font-mono uppercase font-bold">Breve Descrição (Billboard)</label>
                    <input 
                      type="text" 
                      value={adminDescription}
                      onChange={(e) => setAdminDescription(e.target.value)}
                      placeholder="Ex: Lute contra personagens clássicos da Nintendo em arenas nostálgicas!"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-3xs text-zinc-400 font-mono uppercase font-bold">Sinopse Detalhada & História</label>
                    <textarea 
                      value={adminSynopsis}
                      onChange={(e) => setAdminSynopsis(e.target.value)}
                      rows={3}
                      placeholder="Conte sobre os bastidores da criação do jogo, seu impacto cultural..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-3xs text-zinc-400 font-mono uppercase font-bold">Controles (um por linha)</label>
                      <textarea 
                        value={adminControls}
                        onChange={(e) => setAdminControls(e.target.value)}
                        rows={2}
                        placeholder="Ex: Analógico: Mover&#10;Botão A: Pular"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-3xs text-white font-mono focus:outline-none focus:border-red-600"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-3xs text-zinc-400 font-mono uppercase font-bold">Códigos Cheats (um por linha)</label>
                      <textarea 
                        value={adminCheats}
                        onChange={(e) => setAdminCheats(e.target.value)}
                        rows={2}
                        placeholder="Ex: Destravar tudo: C-C-C-Start&#10;Vidas Infinitas: GameShark code"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-3xs text-white font-mono focus:outline-none focus:border-red-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-zinc-800/60 pt-4">
                    <label className="text-3xs text-zinc-400 font-mono uppercase font-bold flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-red-500" /> Selecionar Arquivo ROM (.z64, .n64, .bin, .cue, etc.)
                    </label>
                    <div className="border border-dashed border-zinc-800 hover:border-red-600/30 bg-zinc-950/60 rounded-2xl p-4 text-center cursor-pointer relative group transition-all">
                      <input 
                        type="file" 
                        required
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setAdminFile(file);
                        }}
                        accept=".z64,.n64,.v64,.bin,.cue,.img,.iso,.zip,.pbp"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Database className="w-7 h-7 text-zinc-600 mx-auto group-hover:text-red-500 transition-colors mb-2" />
                      {adminFile ? (
                        <div>
                          <p className="text-xs font-bold text-emerald-400 truncate">{adminFile.name}</p>
                          <p className="text-3xs text-zinc-500 mt-0.5">Tamanho: {(adminFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-medium text-zinc-400">Arraste a ROM aqui ou clique para selecionar</p>
                          <p className="text-3xs text-zinc-600 mt-1">N64 (.z64, .n64, .v64) ou PS1 (.bin, .cue, .iso, .zip, .pbp)</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingRom || !adminTitle || !adminFile}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-2.5 rounded-full text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/10 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {uploadingRom ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Carregando ROM e Catalogando Jogo...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4" />
                        <span>Publicar Jogo na Nuvem</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Stats & Management Column */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Cloud Storage Quota Bar */}
                <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl backdrop-blur-md space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2.5">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-zinc-400" /> Armazenamento na Nuvem
                    </h5>
                    <span className="text-3xs text-zinc-500 font-mono">Limite: 100 GB</span>
                  </div>
                  
                  {cloudStorage ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline text-2xs font-bold font-sans">
                        <span className="text-zinc-300">
                          {cloudStorage.used >= 1024 * 1024 * 1024 
                            ? `${(cloudStorage.used / (1024 * 1024 * 1024)).toFixed(2)} GB` 
                            : `${(cloudStorage.used / (1024 * 1024)).toFixed(1)} MB`
                          } Usados
                        </span>
                        <span className="text-red-400">
                          {((cloudStorage.total - cloudStorage.used) / (1024 * 1024 * 1024)).toFixed(2)} GB Livres
                        </span>
                      </div>
                      <div className="h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                        <div 
                          className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500" 
                          style={{ width: `${Math.min(100, (cloudStorage.used / cloudStorage.total) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono pt-1">
                        <span>0%</span>
                        <span>{((cloudStorage.used / cloudStorage.total) * 100).toFixed(2)}% utilizado</span>
                        <span>100%</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-3xs text-zinc-650">Calculando armazenamento...</p>
                  )}
                </div>

                {/* Local Client-Side Cache Stats */}
                <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl backdrop-blur-md space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2.5">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-500" /> Cache Local IndexedDB
                    </h5>
                    <span className="text-emerald-400 text-3xs font-mono font-bold uppercase">Ativo</span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-3xs text-zinc-400 leading-normal">
                      Os jogos da nuvem abertos são gravados no cache do seu navegador utilizando <strong className="text-white">IndexedDB</strong>. Isso permite que você jogue os clássicos sem gastar banda de rede em carregamentos repetidos!
                    </p>
                    <div className="flex items-center justify-between bg-zinc-950/80 p-3 rounded-xl border border-zinc-850">
                      <div>
                        <p className="text-3xs text-zinc-500 font-mono uppercase">Espaço Ocupado</p>
                        <p className="text-sm font-extrabold text-white">{(localCacheSize / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        onClick={handleClearClientCache}
                        disabled={localCacheSize === 0}
                        className="bg-zinc-900 border border-zinc-800 hover:border-red-900/30 hover:bg-red-950/10 text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-3xs font-semibold px-3.5 py-2 rounded-full transition-all cursor-pointer"
                      >
                        Limpar Cache
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cloud Games Catalog Manager */}
                <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl backdrop-blur-md space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2.5">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <ListVideo className="w-4 h-4 text-zinc-400" /> Catálogo Ativo ({cloudGames.length})
                    </h5>
                  </div>
                  
                  {loadingCloudGames ? (
                    <div className="text-center p-6"><Loader2 className="w-6 h-6 animate-spin text-red-500 mx-auto" /></div>
                  ) : cloudGames.length === 0 ? (
                    <p className="text-3xs text-zinc-600 text-center py-6">Nenhum jogo cadastrado no armazenamento em nuvem ainda.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 pr-1">
                      {cloudGames.map((cg) => (
                        <div key={cg.id} className="flex items-center justify-between bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850 text-2xs gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white truncate">{cg.title}</p>
                            <div className="flex gap-2 text-3xs text-zinc-500 font-mono mt-0.5">
                              <span className="uppercase text-red-500">{cg.system}</span>
                              <span>•</span>
                              <span>{((cg.fileSize || 0) / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAdminDeleteGame(cg.id, cg.title)}
                            className="bg-zinc-900 hover:bg-red-950/20 border border-zinc-800 hover:border-red-500/30 text-zinc-500 hover:text-red-500 p-2 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Remover Jogo e ROM da Nuvem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
              <Shield className="w-10 h-10 text-red-500 mx-auto mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-zinc-300">Acesso Restrito</p>
              <p className="text-2xs text-zinc-500 mt-1 max-w-sm mx-auto">Você precisa estar logado com privilégios de Administrador para acessar o painel de nuvem.</p>
              <button
                onClick={() => { playBeep(); setAuthIsRegister(false); setShowLoginModal(true); }}
                className="mt-4 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2 rounded-full text-xs transition-colors cursor-pointer"
              >
                Efetuar Login Admin
              </button>
            </div>
          )
        ) : (
          filteredGames.length === 0 ? (
            <div className="text-center p-12 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-3">
              <Gamepad className="w-12 h-12 text-zinc-700 animate-bounce" />
              <p className="text-sm font-semibold text-zinc-400">Nenhum jogo encontrado aqui.</p>
              <p className="text-2xs text-zinc-600 max-w-sm leading-relaxed">
                {activeTab === "favoritos" 
                  ? "Sua lista de favoritos está vazia. Clique no coração em qualquer card para adicioná-lo aqui!"
                  : activeTab === "enviados"
                    ? "Você não enviou nenhuma ROM ainda. Arraste e solte arquivos de jogo (.z64/.bin) na página para começar!"
                    : activeTab === "nuvem"
                      ? "Nenhum jogo coletivo foi adicionado à nuvem ainda. Faça login como administrador e publique o primeiro!"
                      : "Tente mudar os filtros de busca ou navegar por outras abas."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredGames.map((game) => {
                const isFavorite = favorites.includes(game.id);
                const isUploaded = game.id.startsWith("uploaded-");
                return (
                  <div 
                    key={game.id} 
                    className="bg-zinc-900/60 rounded-2xl border border-zinc-800/40 overflow-hidden hover:scale-105 hover:border-red-600/30 transition-all duration-300 flex flex-col justify-between group shadow-lg shadow-black/20 hover:shadow-red-600/5 relative"
                  >
                    {/* Visual card header cover */}
                    <div className={`w-full aspect-[4/3] bg-gradient-to-br ${game.coverGradient} relative flex flex-col justify-between p-3 overflow-hidden`}>
                      
                      {/* Glowing system tag */}
                      <div className="flex justify-between items-center z-10">
                        <span className={`text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded border ${
                          game.system === "n64"
                            ? "bg-purple-950/60 border-purple-700/30 text-purple-300"
                            : "bg-blue-950/60 border-blue-700/30 text-blue-300"
                        }`}>
                          {game.system.toUpperCase()}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-300 font-bold bg-black/40 px-1 py-0.5 rounded">
                          ★ {game.rating}
                        </span>
                      </div>

                      {/* Quick overlay buttons (visible on group hover) */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-1.5 z-10">
                        <button
                          onClick={() => handlePlayCatalogGame(game)}
                          className="bg-red-600 hover:bg-red-500 text-white rounded-full p-2.5 shadow-lg transition-all transform hover:scale-110 cursor-pointer"
                          title={game.isPlayableImmediately ? "Jogar Agora" : "Importar ROM para Jogar"}
                        >
                          <Play className="w-4 h-4 fill-white text-white" />
                        </button>
                        <button
                          onClick={() => { playBeep(); setSelectedDetailsGame(game); }}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full p-2.5 shadow-lg transition-all transform hover:scale-110 cursor-pointer border border-zinc-700/30"
                          title="Ver Fatos & Dicas"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>

                      {/* CRT Scanline look inside card background */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] select-none opacity-30" />
                    </div>

                    {/* Card Description */}
                    <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-200 line-clamp-1 group-hover:text-red-500 transition-colors uppercase font-sans">
                          {game.title}
                        </h4>
                        <p className="text-[9px] text-zinc-500 font-mono truncate">
                          {game.genre} • {game.year}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                        {/* Play Status indicator */}
                        <span className={`text-[8px] font-mono font-bold ${
                          game.isPlayableImmediately 
                            ? "text-emerald-500 bg-emerald-950/20 border border-emerald-500/10 px-1 rounded" 
                            : "text-zinc-500 bg-zinc-950/40 border border-zinc-900/30 px-1 rounded"
                        }`}>
                          {game.isPlayableImmediately ? "PRONTO" : "REQUER ROM"}
                        </span>

                        {/* Favorite Heart action */}
                        <button
                          onClick={() => toggleFavorite(game.id)}
                          className={`text-zinc-500 hover:text-red-500 transition-colors p-1 cursor-pointer`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-red-600 text-red-600" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Explanatory Info Card Banner about the platform */}
        <div className="bg-zinc-900/30 border border-zinc-900/80 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-red-500" />
              <h4 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-200">
                Preservação Digital & Legal
              </h4>
            </div>
            <p className="text-2xs text-zinc-400 leading-relaxed font-sans">
              O NETROM fornece demos técnicas de código aberto livres de direitos para teste imediato. Para jogar os blockbusters do N64 e PS1, arraste e solte o seu próprio arquivo de backup original para rodar 100% no seu navegador com privacidade total.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-red-500" />
              <h4 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-200">
                Núcleos de Emulação Real WASM
              </h4>
            </div>
            <p className="text-2xs text-zinc-400 leading-relaxed font-sans">
              Sem emuladores falsos ou simulações aproximadas. Usamos builds estáveis de WebAssembly da biblioteca EmulatorJS, rodando os emuladores reais <strong>Mupen64Plus</strong> e <strong>PCSX ReARMed</strong> com suporte a múltiplos canais de som e gamepads bluetooth.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red-500" />
              <h4 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-200">
                AI Co-Pilot Integrado
              </h4>
            </div>
            <p className="text-2xs text-zinc-400 leading-relaxed font-sans">
              O Gemini AI Retro Assistant é o seu companheiro perfeito. Ele lê os metadados do jogo ativo e te ensina a jogar, fornece senhas GameShark reais, explica lore obscuros e segredos de desenvolvimento, além de te ajudar a passar de fases complicadas.
            </p>
          </div>
        </div>
      </main>

      {/* Persistent Technical Developer/Telemetry Logs drawer at the very bottom (collapsible) */}
      <footer className="bg-zinc-950 border-t border-zinc-900 mt-12 z-20">
        
        {/* Toggle logs drawer panel header */}
        <div className="bg-zinc-900/40 px-4 sm:px-6 py-2 border-b border-zinc-900 flex justify-between items-center">
          <button 
            onClick={() => { playBeep(); setShowDeveloperLogs(!showDeveloperLogs); }}
            className="flex items-center gap-2 font-mono text-3xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-red-500" />
            <span>PAINEL DE TELEMETRIA DO SISTEMA {showDeveloperLogs ? "[RECOLHER]" : "[EXPANDIR]"}</span>
          </button>
          
          <div className="flex items-center gap-4 text-3xs font-mono text-zinc-500">
            <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-red-600" /> WASM Cores: Ativos</span>
            <span className="flex items-center gap-1"><Tv className="w-3 h-3 text-emerald-500" /> VI: 320x240 WebGL</span>
          </div>
        </div>

        {/* Collapsible log screen block */}
        {showDeveloperLogs && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 font-mono text-[10px] space-y-2">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5 mb-1.5">
              <span className="text-zinc-500 text-3xs">LOGS DE EXECUÇÃO DE HARDWARE EM TEMPO REAL:</span>
              <button 
                onClick={() => setConsoleLogs([])} 
                className="text-zinc-600 hover:text-red-500 flex items-center gap-1 transition-colors"
                title="Limpar Console"
              >
                <Trash2 className="w-3 h-3" /> Limpar Logs
              </button>
            </div>
            
            <div className="bg-black/40 border border-zinc-900 rounded-xl p-3 h-[120px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-900">
              {consoleLogs.length === 0 ? (
                <p className="text-zinc-600 italic">Nenhum log registrado para esta sessão.</p>
              ) : (
                consoleLogs.map((log, index) => {
                  const typeColors = {
                    info: "text-blue-400",
                    warning: "text-yellow-500",
                    success: "text-emerald-400",
                    error: "text-red-500",
                  };
                  return (
                    <div key={index} className="flex gap-2 items-start hover:bg-zinc-900/30 px-1 rounded">
                      <span className="text-zinc-600 shrink-0">{log.timestamp}</span>
                      <span className="bg-zinc-900 text-red-500 px-1 rounded text-[8px] font-bold border border-zinc-800 shrink-0">
                        {log.module}
                      </span>
                      <span className={`${typeColors[log.type]} leading-normal`}>{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-3xs font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shadow shadow-red-500/50" />
            <span>NETROM Streaming Service • Preservando e jogando história.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-red-500 transition-colors flex items-center gap-1">
              Desenvolvido com Mupen64Plus & PCSX ReARMed via WebAssembly
            </span>
          </div>
        </div>
      </footer>

      {/* Elegant Detailed Information Modal for games */}
      <AnimatePresence>
        {selectedDetailsGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Colored header representation of cover */}
              <div className={`w-full h-32 bg-gradient-to-br ${selectedDetailsGame.coverGradient} p-6 flex flex-col justify-end relative`}>
                <button
                  onClick={() => { playBeep(); setSelectedDetailsGame(null); }}
                  className="absolute top-4 right-4 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all border border-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 rounded border bg-black/50 border-white/20 text-white w-fit uppercase mb-1">
                  {selectedDetailsGame.system === "n64" ? "Nintendo 64" : "PlayStation 1"}
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-white uppercase tracking-tight truncate">
                  {selectedDetailsGame.title}
                </h3>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                
                {/* Specs row */}
                <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400 border-b border-zinc-800/60 pb-3">
                  <span className="text-yellow-400">★ {selectedDetailsGame.rating}/10</span>
                  <span>•</span>
                  <span>{selectedDetailsGame.year}</span>
                  <span>•</span>
                  <span>{selectedDetailsGame.genre}</span>
                </div>

                {/* Synopsis */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-red-500 uppercase font-mono">Sinopse & História de Desenvolvimento</p>
                  <p className="text-2xs text-zinc-300 leading-relaxed font-sans text-justify">
                    {selectedDetailsGame.synopsis}
                  </p>
                </div>

                {/* Game secrets / cheats list */}
                <div className="space-y-2 border-t border-zinc-800/60 pt-3">
                  <p className="text-[10px] font-bold text-yellow-500 uppercase font-mono flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Dicas de Execução & Cheats
                  </p>
                  <ul className="space-y-1.5">
                    {selectedDetailsGame.cheats.map((cheat, i) => (
                      <li key={i} className="text-3xs text-zinc-400 leading-normal font-mono list-disc ml-4">
                        {cheat}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Upload File Box - Only if they can't play it immediately */}
                {!selectedDetailsGame.isPlayableImmediately && (
                  <div className="border border-dashed border-red-900/30 bg-red-950/10 rounded-2xl p-4 text-center space-y-2 relative overflow-hidden mt-3">
                    <input
                      type="file"
                      id="details-rom-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedDetailsGame(null);
                          handleRomFile(file);
                        }
                      }}
                      accept={selectedDetailsGame.system === "n64" ? ".z64,.n64,.v64" : ".bin,.cue,.iso,.img,.zip"}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <UploadCloud className="w-8 h-8 text-red-500 mx-auto animate-bounce" />
                    <p className="text-xs font-bold text-zinc-200">Jogar sua própria ROM de {selectedDetailsGame.title}</p>
                    <p className="text-3xs text-zinc-400">
                      Envie o arquivo original de {selectedDetailsGame.system === "n64" ? ".z64/.n64" : ".bin/.iso/.zip"} para iniciar a emulação.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="px-6 py-4 bg-zinc-950/60 border-t border-zinc-850 flex justify-end gap-2.5">
                <button
                  onClick={() => { playBeep(); setSelectedDetailsGame(null); }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold px-5 py-2 rounded-full text-2xs transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                {selectedDetailsGame.isPlayableImmediately ? (
                  <button
                    onClick={() => {
                      setSelectedDetailsGame(null);
                      if (selectedDetailsGame.id.startsWith("cloud-")) {
                        playCloudGame(selectedDetailsGame);
                      } else {
                        setActivePlayingGame(selectedDetailsGame);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-full text-2xs transition-all shadow-lg uppercase tracking-wide cursor-pointer"
                  >
                    Iniciar Jogo
                  </button>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Login / Registration Modal Overlay */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative shadow-2xl space-y-4"
            >
              <button
                onClick={() => { playBeep(); setShowLoginModal(false); }}
                className="absolute top-4 right-4 p-1 rounded-full bg-zinc-850 hover:bg-zinc-805 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center justify-center gap-1.5 uppercase font-mono">
                  {authIsRegister ? <User className="w-5 h-5 text-red-500" /> : <Lock className="w-5 h-5 text-red-500" />}
                  {authIsRegister ? "Criar Conta" : "Entrar no NETROM"}
                </h3>
                <p className="text-3xs text-zinc-500">
                  {authIsRegister 
                    ? "Registre-se para acompanhar sua lista de favoritos e acessar recursos!" 
                    : "Faça login com sua conta de jogador ou credenciais de administrador."}
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3 pt-2">
                {authError && (
                  <div className="p-2.5 bg-red-950/40 border border-red-500/20 text-red-400 text-3xs font-semibold rounded-xl text-center">
                    {authError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-zinc-400">Usuário</label>
                  <input
                    type="text"
                    required
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="Seu apelido de jogador"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-zinc-400">Senha</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Sua senha secreta"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all font-mono"
                  />
                </div>

                {authIsRegister && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono font-bold text-zinc-400 flex items-center gap-1">
                      Código Admin <span className="text-[9px] text-zinc-500 font-normal font-sans">(Opcional)</span>
                    </label>
                    <input
                      type="password"
                      value={authAdminCode}
                      onChange={(e) => setAuthAdminCode(e.target.value)}
                      placeholder="Chave secreta para habilitar Admin"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all font-mono"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-2.5 rounded-full text-2xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/15 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {authLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : authIsRegister ? (
                    "Cadastrar"
                  ) : (
                    "Iniciar Sessão"
                  )}
                </button>
              </form>

              <div className="border-t border-zinc-850/60 pt-3 text-center">
                <button
                  onClick={() => { playBeep(); setAuthIsRegister(!authIsRegister); setAuthError(null); }}
                  className="text-[10px] font-medium text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  {authIsRegister ? "Já possui uma conta? Efetue login" : "Novo por aqui? Crie sua conta de Jogador"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gamepad Configurator Overlay */}
      {showGamepadConfigurator && (
        <GamepadConfigurator
          onClose={() => setShowGamepadConfigurator(false)}
          soundEnabled={soundEnabled}
          playBeep={playBeep}
          onAddLog={addLog}
        />
      )}
    </div>
  );
}
