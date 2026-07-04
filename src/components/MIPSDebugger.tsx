/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipForward, RotateCcw, FileCode, CheckCircle, Database, AlertTriangle, Monitor, Sliders } from "lucide-react";
import { MipsVm, INITIAL_REGISTERS } from "../lib/mipsVm";
import { AssemblyPreset, ConsoleLog } from "../types";

interface MIPSDebuggerProps {
  vm: MipsVm;
  onAddLog: (module: "CPU" | "RSP" | "RDP" | "VI" | "SYS" | "AI", msg: string, type: "info" | "warning" | "success" | "error") => void;
  assemblyCode: string;
  setAssemblyCode: (code: string) => void;
  soundEnabled: boolean;
  playBeep: () => void;
  playClack: () => void;
}

export const ASSEMBLY_PRESETS: AssemblyPreset[] = [
  {
    name: "Círculo Pulsante N64",
    description: "Loop MIPS que desenha um padrão circular colorido no monitor retro do N64.",
    code: `# Desenha um círculo de teste na tela
# Memória de vídeo mapeada: 0 a 3072 (64x48)
# Cores: 1=Vermelho, 2=Verde, 3=Azul, 4=Amarelo, 5=Roxo

inicializar:
  li $t0, 0        # $t0 = Ponteiro de pixel (0)
  li $t1, 3072     # $t1 = Total de pixels (64 * 48)
  li $t2, 24       # $t2 = Centro Y (24)
  li $t3, 32       # $t3 = Centro X (32)
  li $t4, 15       # $t4 = Raio ao quadrado (15^2 = 225)

desenhar_loop:
  # Calcular X e Y a partir de $t0
  # Y = $t0 / 64
  # X = $t0 % 64 (simulado)
  addi $t5, $t0, 0
  li $t6, 64
  
  # Loop interno de coordenadas
  addi $s0, $zero, 0 # $s0 = Y temporário
  addi $s1, $zero, 0 # $s1 = X temporário

calcular_y:
  sub $t5, $t5, $t6
  bne $t5, $zero, incrementa_y
  j desenhar_pixel

incrementa_y:
  addi $s0, $s0, 1
  j calcular_y

desenhar_pixel:
  # Desenha com cor degradê baseada na posição
  addi $t7, $s0, 1   # Cor baseada em Y
  sw $t7, 0($t0)     # Escreve o pixel na VRAM

proximo:
  addi $t0, $t0, 1
  bne $t0, $t1, desenhar_loop
  j inicializar      # Reinicia o loop de renderização`,
  },
  {
    name: "Varredura de Plasma Retro",
    description: "Cria uma onda psicodélica alternando cores ao longo da memória RAM de vídeo.",
    code: `# Varredura de Plasma VRAM
# Preenche toda a tela linha por linha com cores alternadas

reiniciar:
  li $t0, 0        # $t0 = Pixel atual
  li $t1, 3072     # $t1 = Total de pixels (64 * 48)
  li $t2, 1        # $t2 = Cor inicial (Vermelho)

loop_plasma:
  # Escreve cor na posição atual
  sw $t2, 0($t0)

  # Altera a cor dinamicamente
  addi $t2, $t2, 1
  li $t3, 7        # Total de cores na paleta
  bne $t2, $t3, avancar
  li $t2, 1        # Volta para cor 1 se estourar

avancar:
  addi $t0, $t0, 1
  bne $t0, $t1, loop_plasma

  # Pausa simulada e reinicia
  j reiniciar`,
  },
  {
    name: "Barra de Cores SMPTE",
    description: "Gera o padrão de calibração clássico de TV para simular o sinal de vídeo (VI).",
    code: `# Padrão de Calibração N64
# Divide a tela em 4 barras verticais perfeitas

inicializar:
  li $t0, 0        # $t0 = Pixel atual
  li $t1, 3072     # $t1 = Fim da VRAM

loop_linhas:
  # Calcular coluna X = $t0 % 64
  # Atribuir cor dependendo da faixa de X
  addi $t2, $t0, 0
  
barra1:
  li $t3, 8
  sw $t3, 0($t0)    # Barra branca/cinza
  j passo_seguinte

passo_seguinte:
  addi $t0, $t0, 1
  bne $t0, $t1, loop_linhas
  nop`,
  },
];

const RETRO_PALETTE = [
  "transparent", // 0
  "#ff3b30",     // 1: Red
  "#34c759",     // 2: Green
  "#007aff",     // 3: Blue
  "#ffcc00",     // 4: Yellow
  "#af52de",     // 5: Purple
  "#5ac8fa",     // 6: Cyan
  "#ffffff",     // 7: White
];

export default function MIPSDebugger({
  vm,
  onAddLog,
  assemblyCode,
  setAssemblyCode,
  soundEnabled,
  playBeep,
  playClack,
}: MIPSDebuggerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [registers, setRegisters] = useState<number[]>(vm.registers);
  const [pc, setPc] = useState<number>(vm.pc);
  const [stepCount, setStepCount] = useState(0);
  const [speed, setSpeed] = useState(50); // Speed ms interval
  const [activeTab, setActiveTab] = useState<"registers" | "ram">("registers");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Re-sync UI with VM state
  const syncState = () => {
    setRegisters([...vm.registers]);
    setPc(vm.pc);
    drawVram();
  };

  // Draw 64x48 VRAM onto virtual monitor canvas
  const drawVram = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellWidth = canvas.width / 64;
    const cellHeight = canvas.height / 48;

    // Draw background grid/pixels
    ctx.fillStyle = "#0c0a1c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 64; x++) {
        const idx = y * 64 + x;
        const colorIdx = vm.vram[idx];
        if (colorIdx > 0) {
          ctx.fillStyle = RETRO_PALETTE[colorIdx % RETRO_PALETTE.length];
          ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        }
      }
    }
  };

  useEffect(() => {
    drawVram();
  }, [registers]);

  // Handle auto-assembling on preset selection
  const handlePresetSelect = (presetCode: string) => {
    if (soundEnabled) playClack();
    setAssemblyCode(presetCode);
    vm.assemble(presetCode);
    syncState();
    onAddLog("CPU", "Novo Preset MIPS carregado. Clique em 'ASSEMBLE' ou 'RUN' para testar.", "info");
  };

  const handleAssemble = () => {
    if (soundEnabled) playBeep();
    vm.assemble(assemblyCode);
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    syncState();
    onAddLog("CPU", "Código compilado com sucesso para binário virtual do N64.", "success");
  };

  const handleStep = () => {
    if (soundEnabled) playClack();
    const success = vm.step();
    setStepCount(prev => prev + 1);
    syncState();
    if (!success) {
      setIsRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  const handleRunToggle = () => {
    if (soundEnabled) playBeep();
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      // Assemble first if not done
      if (vm.instructions.length === 0) {
        vm.assemble(assemblyCode);
      }
      setIsRunning(true);
      onAddLog("CPU", "Executando instruções MIPS continuamente...", "info");

      intervalRef.current = setInterval(() => {
        // Run multiple steps per frame to speed up drawing loops
        let stepCountLimit = speed < 10 ? 15 : 1;
        let success = true;
        for (let i = 0; i < stepCountLimit; i++) {
          success = vm.step();
          if (!success) break;
        }

        setStepCount(prev => prev + 1);
        syncState();

        if (!success) {
          setIsRunning(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, Math.max(1, speed));
    }
  };

  const handleReset = () => {
    if (soundEnabled) playBeep();
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    vm.reset();
    setStepCount(0);
    syncState();
    onAddLog("CPU", "Processador VR4300 resetado com sucesso.", "warning");
  };

  useEffect(() => {
    // Compile default preset on mount if not done
    if (vm.instructions.length === 0) {
      vm.assemble(assemblyCode);
      drawVram();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Update runner when speed changes
  useEffect(() => {
    if (isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        let stepCountLimit = speed < 10 ? 25 : 1;
        let success = true;
        for (let i = 0; i < stepCountLimit; i++) {
          success = vm.step();
          if (!success) break;
        }
        setStepCount(prev => prev + 1);
        syncState();
        if (!success) {
          setIsRunning(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, Math.max(1, speed));
    }
  }, [speed]);

  return (
    <div id="mips-debugger" className="bg-slate-950/80 backdrop-blur-md rounded-2xl border border-purple-900/30 p-4 shadow-2xl flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-purple-950 pb-2">
        <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-1.5">
          <FileCode className="w-4 h-4 text-purple-400" />
          IDE & Compilador MIPS VR4300
        </h3>
        <div className="flex gap-1.5">
          {ASSEMBLY_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetSelect(preset.code)}
              className="text-3xs bg-purple-950/30 hover:bg-purple-900/30 border border-purple-900/30 text-purple-300 px-2 py-1 rounded transition-all font-mono"
              title={preset.description}
            >
              {preset.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Compiler & VM Control Panels Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Code Editor */}
        <div className="flex flex-col gap-2 h-full">
          <div className="flex justify-between items-center text-2xs font-mono text-purple-400 uppercase tracking-wider">
            <span>Editor Assembly (.asm)</span>
            <span className="text-3xs text-gray-500 lowercase">mips64 instructions</span>
          </div>
          <textarea
            value={assemblyCode}
            onChange={(e) => setAssemblyCode(e.target.value)}
            className="flex-1 bg-slate-900 border border-purple-900/20 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none h-[180px] lg:h-auto min-h-[160px] leading-relaxed shadow-inner"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAssemble}
              className="flex-1 bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow border border-purple-500/20 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              ASSEMBLE (COMPILAR)
            </button>
            <button
              onClick={handleReset}
              className="bg-slate-900 hover:bg-slate-800 border border-purple-900/20 text-gray-300 p-1.5 rounded-xl transition-all cursor-pointer"
              title="Reset CPU & VRAM"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hardware Status Panel */}
        <div className="flex flex-col gap-3 justify-between">
          {/* Virtual Video Interface output */}
          <div>
            <div className="flex justify-between items-center text-2xs font-mono text-purple-400 mb-1.5 uppercase">
              <span className="flex items-center gap-1">
                <Monitor className="w-3 h-3 text-purple-400" /> Video Interface (VI)
              </span>
              <span className="text-3xs text-emerald-500 font-bold">64x48 retro mode</span>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-purple-900/25 p-1.5 bg-slate-950/90 shadow-inner">
              <canvas
                ref={canvasRef}
                width={256}
                height={192}
                className="w-full h-[120px] rounded-lg image-rendering-pixelated"
              />
              {/* Scanline CRT overlay effect */}
              <div className="absolute inset-1.5 pointer-events-none rounded-lg bg-gradient-to-b from-transparent via-slate-950/10 to-slate-950/20 opacity-40 mix-blend-overlay" />
            </div>
          </div>

          {/* Controls */}
          <div className="bg-slate-900/40 border border-purple-900/15 rounded-xl p-2.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleRunToggle}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  isRunning
                    ? "bg-red-950/80 border border-red-500/30 text-red-300 hover:bg-red-900/50"
                    : "bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50"
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-red-400 text-red-400 animate-pulse" /> PAUSE
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" /> RUN (RODAR)
                  </>
                )}
              </button>
              <button
                onClick={handleStep}
                disabled={isRunning}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-purple-900/20 text-gray-300 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" /> STEP
              </button>
            </div>

            {/* Speed Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-3xs font-mono text-purple-400">
                <span className="flex items-center gap-1"><Sliders className="w-2.5 h-2.5" /> VELOCIDADE</span>
                <span>{speed < 10 ? "Hyper" : `${speed}ms`}</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
                className="w-full accent-purple-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Register inspector vs memory */}
      <div className="border-t border-purple-950 pt-3">
        <div className="flex gap-2 mb-2 border-b border-purple-950 pb-1.5">
          <button
            onClick={() => { if (soundEnabled) playClack(); setActiveTab("registers"); }}
            className={`text-2xs font-bold uppercase font-mono px-3 py-1 rounded transition-all ${
              activeTab === "registers" ? "bg-purple-950/40 border border-purple-800/40 text-purple-300" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Registradores VR4300
          </button>
          <button
            onClick={() => { if (soundEnabled) playClack(); setActiveTab("ram"); }}
            className={`text-2xs font-bold uppercase font-mono px-3 py-1 rounded transition-all ${
              activeTab === "ram" ? "bg-purple-950/40 border border-purple-800/40 text-purple-300" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Memória RAM (RDRAM)
          </button>
          <div className="ml-auto text-3xs font-mono text-emerald-500 flex items-center gap-2">
            <span>PC: 0x{pc.toString(16).toUpperCase()}</span>
            <span>STEPS: {stepCount}</span>
          </div>
        </div>

        {/* Tab contents */}
        {activeTab === "registers" ? (
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 max-h-[110px] overflow-y-auto pr-1">
            {INITIAL_REGISTERS.map((reg, idx) => {
              const val = registers[idx] || 0;
              return (
                <div
                  key={idx}
                  title={reg.description}
                  className="bg-slate-900/60 border border-purple-950/30 rounded p-1.5 text-center font-mono hover:border-purple-900/30 transition-all cursor-help"
                >
                  <p className="text-3xs text-purple-500 leading-none">{reg.alias}</p>
                  <p className="text-xs font-bold text-gray-200 mt-1 truncate">{val}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-8 md:grid-cols-16 gap-1 max-h-[110px] overflow-y-auto pr-1 font-mono text-3xs text-center text-gray-400">
            {Array.from({ length: 64 }).map((_, idx) => {
              const val = vm.memory[idx] || 0;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/40 border border-purple-950/20 rounded p-1"
                  title={`Endereço RDRAM: 0x${(0x80000000 + idx).toString(16).toUpperCase()}`}
                >
                  <p className="text-4xs text-purple-800 leading-none">+{idx.toString(16).toUpperCase()}</p>
                  <p className="text-2xs font-bold text-emerald-400 mt-0.5">{val.toString(16).padStart(2, "0").toUpperCase()}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
