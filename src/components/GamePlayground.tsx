/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Gamepad, Volume2, VolumeX, Eye, Minimize2, Maximize2, X, HelpCircle, Laptop, Gamepad2, Info } from "lucide-react";
import { Game } from "../data/games";

interface GamePlaygroundProps {
  activeGame: Game;
  customRomUrl?: string; // Used when they load a custom file
  customRomName?: string;
  onClose: () => void;
  onAddLog?: (module: "CPU" | "RSP" | "RDP" | "VI" | "SYS" | "AI", msg: string, type: "info" | "warning" | "success" | "error") => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playBeep: () => void;
}

export default function GamePlayground({
  activeGame,
  customRomUrl,
  customRomName,
  onClose,
  onAddLog,
  soundEnabled,
  setSoundEnabled,
  playBeep,
}: GamePlaygroundProps) {
  const [crtFilter, setCrtFilter] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControlsGuide, setShowControlsGuide] = useState(true);

  const activeRomUrl = customRomUrl || activeGame.romUrl;
  const systemName = activeGame.system === "n64" ? "Nintendo 64" : "PlayStation 1";
  const core = activeGame.system === "n64" ? "n64" : "psx";

  const onAddLogRef = useRef(onAddLog);
  useEffect(() => {
    onAddLogRef.current = onAddLog;
  }, [onAddLog]);

  useEffect(() => {
    if (onAddLogRef.current) {
      onAddLogRef.current("SYS", `Inicializando emulador real para ${activeGame.title} (${systemName.toUpperCase()}). Core: ${core.toUpperCase()}`, "info");
      onAddLogRef.current("VI", `Interface de Vídeo configurada em modo Teatro.`, "success");
    }
  }, [activeGame, core, systemName]);

  const getIframeHtml = (romUrl: string, gameCore: string) => {
    // EmulatorJS config structure
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #09090b;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          #game-container {
            width: 100%;
            height: 100%;
            display: flex;
          }
          /* Custom overrides for emulator style */
          .ejs-control-bar {
            background: rgba(24, 24, 27, 0.95) !important;
            border-top: 1px solid rgba(63, 63, 70, 0.4) !important;
          }
        </style>
      </head>
      <body>
        <div id="game-container">
          <div id="game" style="width: 100%; height: 100%;"></div>
        </div>
        <script>
          window.EJS_player = '#game';
          window.EJS_core = ${JSON.stringify(gameCore)};
          window.EJS_gameUrl = ${JSON.stringify(romUrl)};
          window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
          window.EJS_startOnLoaded = true;
          window.EJS_volume = ${soundEnabled ? "0.6" : "0.0"};
          window.EJS_showLanguageSel = false;
        </script>
        <script src="https://cdn.emulatorjs.org/stable/data/loader.js"></script>
      </body>
      </html>
    `;
  };

  const toggleFullscreen = () => {
    playBeep();
    const element = document.getElementById("game-theater-screen");
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().then(() => {
        setFullscreen(true);
      }).catch(err => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
      {/* Immersive Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-red-600/10 rounded-lg border border-red-500/20 flex items-center justify-center">
            <Gamepad className="w-4.5 h-4.5 text-red-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              {activeGame.title}
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                activeGame.system === "n64"
                  ? "bg-purple-950/40 border-purple-800/40 text-purple-400"
                  : "bg-blue-950/40 border-blue-800/40 text-blue-400"
              }`}>
                {systemName}
              </span>
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
              <span>WASM Emulation Core</span>
              <span>•</span>
              <span className="text-zinc-500 truncate max-w-[200px]">
                {customRomName ? `ROM: ${customRomName}` : "Preloaded Demo"}
              </span>
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          {/* Controls checklist toggle */}
          <button
            onClick={() => { playBeep(); setShowControlsGuide(!showControlsGuide); }}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              showControlsGuide
                ? "bg-zinc-800 border-zinc-700 text-yellow-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
            title="Guia de Controles"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* CRT Scanline Toggle */}
          <button
            onClick={() => { playBeep(); setCrtFilter(!crtFilter); }}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              crtFilter
                ? "bg-zinc-800 border-zinc-700 text-red-500"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
            title={crtFilter ? "Desativar Linhas CRT" : "Ativar Linhas CRT"}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => { playBeep(); setSoundEnabled(!soundEnabled); }}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              soundEnabled
                ? "bg-zinc-800 border-zinc-700 text-red-500"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
            title={soundEnabled ? "Mutar Áudio" : "Ativar Áudio"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all cursor-pointer"
            title="Tela Cheia"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Separation */}
          <div className="w-px h-6 bg-zinc-800 mx-1" />

          {/* Close button */}
          <button
            onClick={() => { playBeep(); onClose(); }}
            className="p-2 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white transition-all cursor-pointer"
            title="Fechar Jogador"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Player view */}
      <div className="flex-1 flex flex-col md:flex-row bg-zinc-950 relative">
        
        {/* Left Side: Game Screen Frame */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-zinc-950">
          <div 
            id="game-theater-screen" 
            className="relative w-full max-w-[620px] aspect-[4/3] bg-black rounded-2xl border-4 border-zinc-800 shadow-2xl shadow-black overflow-hidden group"
          >
            {/* The EmulatorJS Sandbox Iframe */}
            {activeRomUrl ? (
              <iframe
                key={`${activeRomUrl}-${soundEnabled}`}
                srcDoc={getIframeHtml(activeRomUrl, core)}
                className="w-full h-full block border-0"
                allow="autoplay; gamepad"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-zinc-900">
                <p className="text-sm font-semibold text-zinc-400">Carregando arquivo de ROM...</p>
              </div>
            )}

            {/* CRT Screen scanline overlay effect */}
            {crtFilter && (
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] select-none opacity-20 z-10" />
            )}
            
            {/* Ambient vignette reflection effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-transparent to-white/5 opacity-15 z-10" />
          </div>
        </div>

        {/* Right Side: Quick Controls & Instructions Panel (collapsible or side column) */}
        {showControlsGuide && (
          <div className="w-full md:w-[260px] bg-zinc-900/70 border-t md:border-t-0 md:border-l border-zinc-800 p-4 flex flex-col gap-3 overflow-y-auto max-h-[300px] md:max-h-none">
            <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2">
              <Laptop className="w-4 h-4 text-red-500" />
              <h4 className="text-xs font-bold text-gray-200 uppercase font-mono">Guia do Jogador</h4>
            </div>

            {/* Map list */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1 font-mono">
                  <Gamepad2 className="w-3.5 h-3.5 text-red-500" /> Controles Atribuídos:
                </p>
                <ul className="space-y-1">
                  {activeGame.controls.map((ctrl, i) => (
                    <li key={i} className="text-2xs text-zinc-300 leading-relaxed font-mono pl-2 border-l-2 border-red-500/40">
                      {ctrl}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/40 space-y-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1 font-mono">
                  <Info className="w-3.5 h-3.5 text-yellow-500" /> Dica de Controle
                </p>
                <p className="text-3xs text-zinc-400 leading-normal">
                  Este emulador suporta controles USB/Bluetooth de forma nativa! Você pode testar e pré-configurar seus botões usando a <strong>Central de Controles</strong> no topo do aplicativo, ou mapear diretamente no menu de engrenagem do próprio emulador!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
