/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Gamepad, 
  X, 
  RotateCcw, 
  Wifi, 
  WifiOff, 
  SlidersHorizontal, 
  Sparkles, 
  Check, 
  Activity, 
  Info, 
  Sliders,
  HelpCircle
} from "lucide-react";

interface GamepadConfiguratorProps {
  onClose: () => void;
  soundEnabled: boolean;
  playBeep: () => void;
  onAddLog?: (module: "CPU" | "RSP" | "RDP" | "VI" | "SYS" | "AI", msg: string, type: "info" | "warning" | "success" | "error") => void;
}

export interface VirtualButtonMap {
  [key: string]: {
    label: string;
    physicalButtonIndex: number | null; // index in Gamepad.buttons
    physicalAxisIndex: number | null;   // index in Gamepad.axes if axis
    axisDirection?: 1 | -1;            // direction if axis mapped (e.g. stick)
  };
}

const DEFAULT_N64_MAPPING: VirtualButtonMap = {
  "A": { label: "Botão A", physicalButtonIndex: 0, physicalAxisIndex: null },
  "B": { label: "Botão B", physicalButtonIndex: 2, physicalAxisIndex: null },
  "Start": { label: "Botão Start", physicalButtonIndex: 9, physicalAxisIndex: null },
  "Z": { label: "Gatilho Z", physicalButtonIndex: 6, physicalAxisIndex: null },
  "L": { label: "Botão L (Esquerdo)", physicalButtonIndex: 4, physicalAxisIndex: null },
  "R": { label: "Botão R (Direito)", physicalButtonIndex: 5, physicalAxisIndex: null },
  "D-Up": { label: "Direcional Digital Cima", physicalButtonIndex: 12, physicalAxisIndex: null },
  "D-Down": { label: "Direcional Digital Baixo", physicalButtonIndex: 13, physicalAxisIndex: null },
  "D-Left": { label: "Direcional Digital Esquerda", physicalButtonIndex: 14, physicalAxisIndex: null },
  "D-Right": { label: "Direcional Digital Direita", physicalButtonIndex: 15, physicalAxisIndex: null },
  "C-Up": { label: "Botão C-Cima", physicalButtonIndex: null, physicalAxisIndex: 3, axisDirection: -1 },
  "C-Down": { label: "Botão C-Baixo", physicalButtonIndex: null, physicalAxisIndex: 3, axisDirection: 1 },
  "C-Left": { label: "Botão C-Esquerda", physicalButtonIndex: null, physicalAxisIndex: 2, axisDirection: -1 },
  "C-Right": { label: "Botão C-Direita", physicalButtonIndex: null, physicalAxisIndex: 2, axisDirection: 1 },
  "Analog-Up": { label: "Alavanca Cima", physicalButtonIndex: null, physicalAxisIndex: 1, axisDirection: -1 },
  "Analog-Down": { label: "Alavanca Baixo", physicalButtonIndex: null, physicalAxisIndex: 1, axisDirection: 1 },
  "Analog-Left": { label: "Alavanca Esquerda", physicalButtonIndex: null, physicalAxisIndex: 0, axisDirection: -1 },
  "Analog-Right": { label: "Alavanca Direita", physicalButtonIndex: null, physicalAxisIndex: 0, axisDirection: 1 },
};

const DEFAULT_PSX_MAPPING: VirtualButtonMap = {
  "Cross": { label: "Botão ✖ (Cruz)", physicalButtonIndex: 0, physicalAxisIndex: null },
  "Circle": { label: "Botão ● (Círculo)", physicalButtonIndex: 1, physicalAxisIndex: null },
  "Square": { label: "Botão ■ (Quadrado)", physicalButtonIndex: 2, physicalAxisIndex: null },
  "Triangle": { label: "Botão ▲ (Triângulo)", physicalButtonIndex: 3, physicalAxisIndex: null },
  "Select": { label: "Botão Select", physicalButtonIndex: 8, physicalAxisIndex: null },
  "Start": { label: "Botão Start", physicalButtonIndex: 9, physicalAxisIndex: null },
  "L1": { label: "Botão L1", physicalButtonIndex: 4, physicalAxisIndex: null },
  "R1": { label: "Botão R1", physicalButtonIndex: 5, physicalAxisIndex: null },
  "L2": { label: "Gatilho L2", physicalButtonIndex: 6, physicalAxisIndex: null },
  "R2": { label: "Gatilho R2", physicalButtonIndex: 7, physicalAxisIndex: null },
  "D-Up": { label: "Direcional Cima", physicalButtonIndex: 12, physicalAxisIndex: null },
  "D-Down": { label: "Direcional Baixo", physicalButtonIndex: 13, physicalAxisIndex: null },
  "D-Left": { label: "Direcional Esquerda", physicalButtonIndex: 14, physicalAxisIndex: null },
  "D-Right": { label: "Direcional Direita", physicalButtonIndex: 15, physicalAxisIndex: null },
};

export default function GamepadConfigurator({
  onClose,
  soundEnabled,
  playBeep,
  onAddLog
}: GamepadConfiguratorProps) {
  const [selectedSystem, setSelectedSystem] = useState<"n64" | "psx">("n64");
  const [connectedGamepads, setConnectedGamepads] = useState<Gamepad[]>([]);
  const [selectedGamepadIndex, setSelectedGamepadIndex] = useState<number>(0);
  
  // Gamepad active state
  const [buttonStates, setButtonStates] = useState<boolean[]>([]);
  const [axesStates, setAxesStates] = useState<number[]>([]);
  
  // Custom Mappings
  const [n64Mapping, setN64Mapping] = useState<VirtualButtonMap>(DEFAULT_N64_MAPPING);
  const [psxMapping, setPsxMapping] = useState<VirtualButtonMap>(DEFAULT_PSX_MAPPING);
  
  // Binding State
  const [bindingKey, setBindingKey] = useState<string | null>(null);
  const [bindingType, setBindingType] = useState<"button" | "axis" | null>(null);

  // References for polling loop
  const requestRef = useRef<number | null>(null);
  const previousButtonsRef = useRef<boolean[]>([]);
  const previousAxesRef = useRef<number[]>([]);
  const lastStateButtonsRef = useRef<boolean[]>([]);
  const lastStateAxesRef = useRef<number[]>([]);

  const onAddLogRef = useRef(onAddLog);
  useEffect(() => {
    onAddLogRef.current = onAddLog;
  }, [onAddLog]);

  // Load custom mappings from LocalStorage on mount
  useEffect(() => {
    try {
      const savedN64 = localStorage.getItem("netrom-mapping-n64");
      if (savedN64) setN64Mapping(JSON.parse(savedN64));
      
      const savedPSX = localStorage.getItem("netrom-mapping-psx");
      if (savedPSX) setPsxMapping(JSON.parse(savedPSX));
    } catch (e) {
      console.warn("Could not load custom controller mapping:", e);
    }
  }, []);

  // Sync to localStorage when altered
  const saveMapping = (system: "n64" | "psx", updated: VirtualButtonMap) => {
    if (system === "n64") {
      setN64Mapping(updated);
      localStorage.setItem("netrom-mapping-n64", JSON.stringify(updated));
    } else {
      setPsxMapping(updated);
      localStorage.setItem("netrom-mapping-psx", JSON.stringify(updated));
    }
    if (onAddLog) {
      onAddLog("SYS", `Mapeamento de controle de ${system.toUpperCase()} atualizado e salvo localmente.`, "success");
    }
  };

  // Reset mappings to system defaults
  const resetMapping = () => {
    playBeep();
    if (selectedSystem === "n64") {
      saveMapping("n64", DEFAULT_N64_MAPPING);
    } else {
      saveMapping("psx", DEFAULT_PSX_MAPPING);
    }
  };

  // Poll Connected Gamepads & Active States
  useEffect(() => {
    const scanGamepads = () => {
      // Get standard gamepads array, filtering nulls
      const list = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) as Gamepad[] : [];
      setConnectedGamepads(list);
    };

    // Listeners
    const handleConnect = (e: GamepadEvent) => {
      scanGamepads();
      if (onAddLogRef.current) {
        onAddLogRef.current("SYS", `Controle Bluetooth/USB Conectado: "${e.gamepad.id}" na porta ${e.gamepad.index}.`, "success");
      }
    };

    const handleDisconnect = (e: GamepadEvent) => {
      scanGamepads();
      if (onAddLogRef.current) {
        onAddLogRef.current("SYS", `Controle Desconectado da porta ${e.gamepad.index}: ${e.gamepad.id}`, "warning");
      }
    };

    window.addEventListener("gamepadconnected", handleConnect);
    window.addEventListener("gamepaddisconnected", handleDisconnect);
    
    // Initial scan
    scanGamepads();

    return () => {
      window.removeEventListener("gamepadconnected", handleConnect);
      window.removeEventListener("gamepaddisconnected", handleDisconnect);
    };
  }, []);

  // Main Polling Loop for Button States and Config Binding
  useEffect(() => {
    const pollGamepadState = () => {
      const list = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) as Gamepad[] : [];
      
      // Look for the selected index
      const activeGamepad = list.find(g => g.index === selectedGamepadIndex);
      
      if (activeGamepad) {
        // Retrieve buttons state
        const currentButtons = activeGamepad.buttons.map(b => b.pressed);
        const currentAxes = [...activeGamepad.axes];
        
        // Only trigger React state updates if values have actually changed
        const buttonsChanged = currentButtons.length !== lastStateButtonsRef.current.length ||
          currentButtons.some((val, idx) => val !== lastStateButtonsRef.current[idx]);
          
        const axesChanged = currentAxes.length !== lastStateAxesRef.current.length ||
          currentAxes.some((val, idx) => val !== lastStateAxesRef.current[idx]);

        if (buttonsChanged) {
          lastStateButtonsRef.current = currentButtons;
          setButtonStates(currentButtons);
        }
        if (axesChanged) {
          lastStateAxesRef.current = currentAxes;
          setAxesStates(currentAxes);
        }

        // --- BUTTON BINDING LOGIC ---
        if (bindingKey) {
          // Detect physical button pressed
          const pressedButtonIndex = currentButtons.findIndex((pressed, index) => {
            return pressed && !previousButtonsRef.current[index];
          });

          if (pressedButtonIndex !== -1) {
            // Found a newly pressed button! Let's map it!
            playBeep();
            const currentMap = selectedSystem === "n64" ? { ...n64Mapping } : { ...psxMapping };
            currentMap[bindingKey] = {
              label: currentMap[bindingKey].label,
              physicalButtonIndex: pressedButtonIndex,
              physicalAxisIndex: null
            };
            saveMapping(selectedSystem, currentMap);
            setBindingKey(null);
            setBindingType(null);
          } else {
            // Detect axis tilt (if they move a stick beyond a 0.75 threshold)
            const tiltedAxisIndex = currentAxes.findIndex((val, index) => {
              const prevVal = previousAxesRef.current[index] || 0;
              return Math.abs(val) > 0.75 && Math.abs(prevVal) <= 0.25;
            });

            if (tiltedAxisIndex !== -1) {
              playBeep();
              const val = currentAxes[tiltedAxisIndex];
              const direction = val > 0 ? 1 : -1;
              const currentMap = selectedSystem === "n64" ? { ...n64Mapping } : { ...psxMapping };
              
              currentMap[bindingKey] = {
                label: currentMap[bindingKey].label,
                physicalButtonIndex: null,
                physicalAxisIndex: tiltedAxisIndex,
                axisDirection: direction
              };
              saveMapping(selectedSystem, currentMap);
              setBindingKey(null);
              setBindingType(null);
            }
          }
        }

        // Update previous buffers
        previousButtonsRef.current = currentButtons;
        previousAxesRef.current = currentAxes;
      } else {
        if (lastStateButtonsRef.current.length !== 0) {
          lastStateButtonsRef.current = [];
          setButtonStates([]);
        }
        if (lastStateAxesRef.current.length !== 0) {
          lastStateAxesRef.current = [];
          setAxesStates([]);
        }
      }

      requestRef.current = requestAnimationFrame(pollGamepadState);
    };

    requestRef.current = requestAnimationFrame(pollGamepadState);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [selectedGamepadIndex, bindingKey, selectedSystem, n64Mapping, psxMapping]);

  const activeMapping = selectedSystem === "n64" ? n64Mapping : psxMapping;

  // Helper to determine if a virtual key is active right now based on physical states
  const isVirtualButtonActive = (key: string): boolean => {
    const config = activeMapping[key];
    if (!config) return false;

    // Check mapped button
    if (config.physicalButtonIndex !== null && buttonStates[config.physicalButtonIndex]) {
      return true;
    }

    // Check mapped axis direction
    if (config.physicalAxisIndex !== null && axesStates[config.physicalAxisIndex] !== undefined) {
      const axisVal = axesStates[config.physicalAxisIndex];
      const dir = config.axisDirection || 1;
      // If stick is tilted past a 0.5 threshold in that direction
      if (dir === 1 && axisVal > 0.5) return true;
      if (dir === -1 && axisVal < -0.5) return true;
    }

    return false;
  };

  // Quick Auto-configuration for standard gamepads
  const handleAutoConfigure = () => {
    playBeep();
    if (selectedSystem === "n64") {
      saveMapping("n64", DEFAULT_N64_MAPPING);
    } else {
      saveMapping("psx", DEFAULT_PSX_MAPPING);
    }
  };

  return (
    <div id="gamepad-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Top thin red aesthetic brand line */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-red-600" />

        {/* Modal Header */}
        <div className="px-6 py-4 bg-zinc-900/60 border-b border-zinc-900 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/10 rounded-xl border border-red-500/20">
              <Gamepad className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200 flex items-center gap-2 font-mono">
                Central de Controles Bluetooth / USB
                <span className="text-[10px] bg-red-600 text-white font-sans font-bold px-1.5 py-0.5 rounded">WEB-API</span>
              </h2>
              <p className="text-[10px] text-zinc-400 font-mono">Configure, teste e otimize seus joysticks retrô</p>
            </div>
          </div>
          <button
            onClick={() => { playBeep(); onClose(); }}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer border border-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Outer Split Pane Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Device Selector & Testing Arena (Col 5) */}
          <div className="lg:col-span-5 flex flex-col gap-5 border-r lg:border-r-0 lg:border-zinc-900">
            
            {/* System selector tab */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-1 rounded-xl flex">
              <button
                onClick={() => { playBeep(); setSelectedSystem("n64"); }}
                className={`flex-1 py-1.5 text-xs font-bold font-mono tracking-wider uppercase rounded-lg transition-all ${
                  selectedSystem === "n64"
                    ? "bg-purple-950/40 text-purple-400 border border-purple-800/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Nintendo 64
              </button>
              <button
                onClick={() => { playBeep(); setSelectedSystem("psx"); }}
                className={`flex-1 py-1.5 text-xs font-bold font-mono tracking-wider uppercase rounded-lg transition-all ${
                  selectedSystem === "psx"
                    ? "bg-blue-950/40 text-blue-400 border border-blue-800/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                PlayStation 1
              </button>
            </div>

            {/* Device list */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Dispositivos Detectados</span>
              {connectedGamepads.length === 0 ? (
                <div className="p-4 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                  <WifiOff className="w-8 h-8 text-zinc-600 animate-pulse" />
                  <p className="text-xs font-bold text-zinc-400">Nenhum joystick detectado</p>
                  <p className="text-3xs text-zinc-500 leading-normal max-w-[240px]">
                    Ligue o Bluetooth, conecte o controle e <strong className="text-red-500">pressione qualquer botão</strong> para ativá-lo no navegador!
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {connectedGamepads.map((gp) => (
                    <button
                      key={gp.index}
                      onClick={() => { playBeep(); setSelectedGamepadIndex(gp.index); }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        selectedGamepadIndex === gp.index
                          ? "bg-red-950/10 border-red-500/40 text-red-400"
                          : "bg-zinc-900/40 border-zinc-900 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Wifi className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-bold truncate leading-normal uppercase">{gp.id}</p>
                          <p className="text-3xs text-zinc-500 font-mono">ID: #{gp.index} • Botões: {gp.buttons.length} • Analógicos: {gp.axes.length}</p>
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow shadow-emerald-500/50 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Real-time button tester arena */}
            {connectedGamepads.length > 0 && (
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl p-4 flex flex-col items-center gap-4 relative overflow-hidden">
                <div className="flex items-center gap-1.5 self-start border-b border-zinc-900 pb-1.5 w-full">
                  <Activity className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
                  <span className="text-[9px] font-extrabold uppercase font-mono text-zinc-400">Arena de Teste do Controle</span>
                </div>

                {/* Simulated Gamepad Visualizer (Interactive SVG representation) */}
                <div className="w-full h-[140px] flex items-center justify-center relative bg-black/30 rounded-xl border border-zinc-900">
                  {selectedSystem === "n64" ? (
                    // N64 controller shape mock SVG
                    <svg viewBox="0 0 200 120" className="w-full max-w-[200px] opacity-80">
                      {/* Grey Shell */}
                      <path d="M40 30 C 50 10, 150 10, 160 30 C 170 50, 180 110, 140 110 C 120 110, 110 70, 100 70 C 90 70, 80 110, 60 110 C 20 110, 30 50, 40 30 Z" fill="#2d2d30" stroke="#444" strokeWidth="1.5" />
                      
                      {/* D-Pad */}
                      <g transform="translate(45, 45)">
                        <rect x="-4" y="-12" width="8" height="24" rx="2" fill={isVirtualButtonActive("D-Up") || isVirtualButtonActive("D-Down") ? "#e11d48" : "#1e1e1f"} />
                        <rect x="-12" y="-4" width="24" height="8" rx="2" fill={isVirtualButtonActive("D-Left") || isVirtualButtonActive("D-Right") ? "#e11d48" : "#1e1e1f"} />
                        <circle cx="0" cy="0" r="2" fill="#555" />
                      </g>

                      {/* Left/Middle Analog Stick */}
                      <g transform="translate(100, 85)">
                        <circle cx="0" cy="0" r="16" fill="#18181b" stroke="#333" />
                        {/* Interactive stick handle based on physical axes */}
                        <circle 
                          cx={(axesStates[0] || 0) * 8} 
                          cy={(axesStates[1] || 0) * 8} 
                          r="6" 
                          fill={isVirtualButtonActive("Analog-Up") || isVirtualButtonActive("Analog-Down") || isVirtualButtonActive("Analog-Left") || isVirtualButtonActive("Analog-Right") ? "#e11d48" : "#71717a"} 
                        />
                      </g>

                      {/* Start Button */}
                      <polygon 
                        points="92,42 108,42 100,48" 
                        fill={isVirtualButtonActive("Start") ? "#e11d48" : "#dc2626"} 
                        stroke="#500" 
                      />

                      {/* Yellow C Buttons */}
                      <g transform="translate(145, 45)">
                        <circle cx="0" cy="-10" r="4.5" fill={isVirtualButtonActive("C-Up") ? "#e11d48" : "#facc15"} />
                        <circle cx="0" cy="10" r="4.5" fill={isVirtualButtonActive("C-Down") ? "#e11d48" : "#facc15"} />
                        <circle cx="-10" cy="0" r="4.5" fill={isVirtualButtonActive("C-Left") ? "#e11d48" : "#facc15"} />
                        <circle cx="10" cy="0" r="4.5" fill={isVirtualButtonActive("C-Right") ? "#e11d48" : "#facc15"} />
                      </g>

                      {/* Red/Green Main Buttons */}
                      <circle cx="125" cy="65" r="6" fill={isVirtualButtonActive("B") ? "#e11d48" : "#059669"} /> {/* B (Green) */}
                      <circle cx="140" cy="72" r="6" fill={isVirtualButtonActive("A") ? "#e11d48" : "#2563eb"} /> {/* A (Blue) */}

                      {/* Triggers */}
                      <rect x="35" y="15" width="20" height="5" rx="1.5" fill={isVirtualButtonActive("L") ? "#e11d48" : "#1e1e1f"} />
                      <rect x="145" y="15" width="20" height="5" rx="1.5" fill={isVirtualButtonActive("R") ? "#e11d48" : "#1e1e1f"} />
                    </svg>
                  ) : (
                    // PSX controller shape SVG
                    <svg viewBox="0 0 200 120" className="w-full max-w-[200px] opacity-80">
                      {/* Controller Body */}
                      <path d="M 50 35 C 70 30, 130 30, 150 35 C 170 35, 195 70, 185 105 C 180 115, 160 115, 145 100 C 130 90, 70 90, 55 100 C 40 115, 20 115, 15 105 C 5 70, 30 35, 50 35 Z" fill="#2d2d30" stroke="#444" strokeWidth="1.5" />
                      
                      {/* D-Pad Left side */}
                      <g transform="translate(45, 55)">
                        <rect x="-4" y="-12" width="8" height="24" rx="2.5" fill={isVirtualButtonActive("D-Up") || isVirtualButtonActive("D-Down") ? "#e11d48" : "#18181b"} />
                        <rect x="-12" y="-4" width="24" height="8" rx="2.5" fill={isVirtualButtonActive("D-Left") || isVirtualButtonActive("D-Right") ? "#e11d48" : "#18181b"} />
                      </g>

                      {/* Select & Start */}
                      <rect x="80" y="58" width="14" height="5" rx="2.5" transform="rotate(-20 87 60)" fill={isVirtualButtonActive("Select") ? "#e11d48" : "#555"} />
                      <rect x="106" y="58" width="14" height="5" rx="2.5" transform="rotate(-20 113 60)" fill={isVirtualButtonActive("Start") ? "#e11d48" : "#555"} />

                      {/* Right side buttons (Shapes) */}
                      <g transform="translate(155, 55)">
                        <circle cx="0" cy="-10" r="5" fill={isVirtualButtonActive("Triangle") ? "#e11d48" : "#111827"} stroke="#10b981" strokeWidth="1" /> {/* Triangle */}
                        <circle cx="0" cy="10" r="5" fill={isVirtualButtonActive("Cross") ? "#e11d48" : "#111827"} stroke="#3b82f6" strokeWidth="1" /> {/* Cross */}
                        <circle cx="-10" cy="0" r="5" fill={isVirtualButtonActive("Square") ? "#e11d48" : "#111827"} stroke="#ec4899" strokeWidth="1" /> {/* Square */}
                        <circle cx="10" cy="0" r="5" fill={isVirtualButtonActive("Circle") ? "#e11d48" : "#111827"} stroke="#ef4444" strokeWidth="1" /> {/* Circle */}
                      </g>

                      {/* Shoulder bumpers */}
                      <rect x="35" y="20" width="22" height="6" rx="2" fill={isVirtualButtonActive("L1") || isVirtualButtonActive("L2") ? "#e11d48" : "#1c1917"} />
                      <rect x="143" y="20" width="22" height="6" rx="2" fill={isVirtualButtonActive("R1") || isVirtualButtonActive("R2") ? "#e11d48" : "#1c1917"} />
                    </svg>
                  )}
                </div>

                <div className="w-full flex justify-between items-center gap-3">
                  <p className="text-[10px] text-zinc-500 font-mono">Pressione os botões do joystick físico e veja-os acenderem em vermelho!</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Keybinds Mapper Table (Col 7) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-red-500" />
                <span className="text-xs font-extrabold uppercase font-mono text-zinc-300">Tabela de Mapeamento Técnico</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={resetMapping}
                  className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-3xs font-bold font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                  title="Restaurar Configurações Padrão"
                >
                  <RotateCcw className="w-3 h-3" /> Padrão
                </button>
              </div>
            </div>

            {/* If in Binding mode overlay explanation */}
            {bindingKey && (
              <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-2xl animate-pulse flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <p className="text-2xs font-bold font-mono text-red-400 uppercase">
                    Aguardando entrada para: <span className="text-white">"{activeMapping[bindingKey].label}"</span>
                  </p>
                </div>
                <button
                  onClick={() => { playBeep(); setBindingKey(null); setBindingType(null); }}
                  className="text-3xs font-bold font-mono text-zinc-500 hover:text-zinc-300 uppercase underline cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* Scrollable list of map items */}
            <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-900/10 divide-y divide-zinc-900 max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-900">
              {(Object.entries(activeMapping) as [string, typeof activeMapping[string]][]).map(([key, config]) => {
                const isBinding = bindingKey === key;
                const isActiveNow = isVirtualButtonActive(key);
                
                // Construct a human readable name of physical button assigned
                let assignedLabel = "Não Atribuído";
                if (config.physicalButtonIndex !== null) {
                  assignedLabel = `Botão Físico #${config.physicalButtonIndex}`;
                } else if (config.physicalAxisIndex !== null) {
                  const dirText = config.axisDirection === 1 ? "+" : "-";
                  assignedLabel = `Eixo Analógico #${config.physicalAxisIndex} [${dirText}]`;
                }

                return (
                  <div 
                    key={key} 
                    className={`flex items-center justify-between p-3 transition-colors ${
                      isBinding 
                        ? "bg-red-950/10" 
                        : isActiveNow 
                          ? "bg-zinc-900/40" 
                          : "hover:bg-zinc-900/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Active indicator badge */}
                      <div className={`w-2 h-2 rounded-full transition-all shrink-0 ${
                        isActiveNow 
                          ? "bg-red-500 shadow shadow-red-500/50" 
                          : "bg-zinc-800"
                      }`} />
                      
                      <div>
                        <p className="text-2xs font-bold text-zinc-200">{config.label}</p>
                        <p className="text-[9px] text-zinc-500 font-mono uppercase">{key}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-3xs font-mono px-2 py-1 rounded border leading-none font-semibold ${
                        config.physicalButtonIndex !== null || config.physicalAxisIndex !== null
                          ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                          : "bg-zinc-950 border-zinc-900 text-zinc-600"
                      }`}>
                        {assignedLabel}
                      </span>

                      <button
                        onClick={() => { playBeep(); setBindingKey(key); }}
                        disabled={connectedGamepads.length === 0}
                        className={`px-3 py-1 rounded-lg text-3xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                          isBinding
                            ? "bg-red-600 text-white border-red-500"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        } disabled:opacity-30 disabled:pointer-events-none`}
                      >
                        {isBinding ? "Ouvindo..." : "Mapear"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Info Footer Box explaining EmulatorJS config */}
        <div className="p-4 bg-zinc-900/40 border-t border-zinc-900 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-2.5 max-w-xl">
            <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-3xs text-zinc-400 leading-normal">
              <strong>Nota Importante de Integração:</strong> Este painel configura e valida os joysticks Bluetooth no navegador em tempo real. O emulador <strong>EmulatorJS</strong> possui um mapeamento de gamepad nativo robusto. Quando o jogo carregar, você pode clicar no ícone de controle na barra inferior do emulador para mapear botões adicionais, calibrar as zonas mortas dos direcionais analógicos ou configurar perfis para até 4 jogadores simultâneos!
            </p>
          </div>
          <button
            onClick={() => { playBeep(); onClose(); }}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-extrabold px-6 py-2 rounded-full text-xs transition-colors shrink-0 uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-red-600/10"
          >
            Pronto
          </button>
        </div>
      </div>
    </div>
  );
}
