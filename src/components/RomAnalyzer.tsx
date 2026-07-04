/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Cpu, HardDrive, FileUp, ShieldCheck, Database, Landmark, AlertCircle } from "lucide-react";
import { RomMetadata } from "../types";

interface RomAnalyzerProps {
  currentRom: RomMetadata | null;
  onRomSelected: (rom: RomMetadata) => void;
  onAddLog: (module: "CPU" | "RSP" | "RDP" | "VI" | "SYS" | "AI", msg: string, type: "info" | "warning" | "success" | "error") => void;
  soundEnabled: boolean;
  playBeep: () => void;
  playEject: () => void;
}

// Built-in iconic virtual ROMs to test with instantly
export const VIRTUAL_ROMS: RomMetadata[] = [
  {
    fileName: "super_mario_64_usa.z64",
    fileSize: 8388608, // 8MB
    endianness: "Big Endian (z64)",
    magic: "0x80371240",
    clockRate: "0x0000000F",
    entryPoint: "0x80000400",
    crc1: "0x635A2BFF",
    crc2: "0x3C1045A9",
    title: "SUPER MARIO 64      ",
    productId: "NSME",
    version: 0,
    publisher: "Nintendo",
    country: "North America (USA)",
  },
  {
    fileName: "mario_kart_64_usa.v64",
    fileSize: 12582912, // 12MB
    endianness: "Mixed Endian (v64)",
    magic: "0x37804012",
    clockRate: "0x0000000F",
    entryPoint: "0x80000400",
    crc1: "0x4B3A82C1",
    crc2: "0x1290EE4B",
    title: "MARIO KART 64       ",
    productId: "NKTE",
    version: 0,
    publisher: "Nintendo",
    country: "North America (USA)",
  },
  {
    fileName: "legend_of_zelda_oot.z64",
    fileSize: 33554432, // 32MB
    endianness: "Big Endian (z64)",
    magic: "0x80371240",
    clockRate: "0x0000000F",
    entryPoint: "0x80000400",
    crc1: "0xEC52B3C5",
    crc2: "0x56E0F124",
    title: "THE LEGEND OF ZELDA ",
    productId: "NZLE",
    version: 0,
    publisher: "Nintendo",
    country: "North America (USA)",
  },
  {
    fileName: "star_fox_64_usa.z64",
    fileSize: 16777216, // 16MB
    endianness: "Big Endian (z64)",
    magic: "0x80371240",
    clockRate: "0x0000000F",
    entryPoint: "0x80000400",
    crc1: "0xAB4E3C29",
    crc2: "0x9E10FC2B",
    title: "STAR FOX 64         ",
    productId: "NFXE",
    version: 0,
    publisher: "Nintendo",
    country: "North America (USA)",
  },
];

export default function RomAnalyzer({
  currentRom,
  onRomSelected,
  onAddLog,
  soundEnabled,
  playBeep,
  playEject,
}: RomAnalyzerProps) {
  const [dragActive, setDragActive] = useState(false);

  // Parse custom uploader files (actual binary parsing!)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (soundEnabled) playBeep();
    parseRomFile(file);
  };

  const parseRomFile = (file: File) => {
    onAddLog("SYS", `Lendo arquivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`, "info");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength < 64) {
          throw new Error("Arquivo muito pequeno para ser uma ROM de Nintendo 64 válida.");
        }

        const view = new DataView(buffer);
        
        // Read Magic Endianness word
        const magic = view.getUint32(0, false);
        let endian: "Big Endian (z64)" | "Little Endian (n64)" | "Mixed Endian (v64)" | "Unknown" = "Unknown";
        let isByteSwapped = false;

        if (magic === 0x80371240) {
          endian = "Big Endian (z64)";
        } else if (magic === 0x37804012) {
          endian = "Mixed Endian (v64)";
          isByteSwapped = true;
        } else if (magic === 0x40123780) {
          endian = "Little Endian (n64)";
        }

        // Helper to get string of bytes with optional byte swapping
        const getCharString = (offset: number, length: number): string => {
          const arr: number[] = [];
          for (let i = 0; i < length; i++) {
            let byteIndex = offset + i;
            if (isByteSwapped) {
              // Swap pairs of bytes
              byteIndex = offset + (i ^ 1);
            }
            if (byteIndex < buffer.byteLength) {
              arr.push(view.getUint8(byteIndex));
            }
          }
          return String.fromCharCode(...arr);
        };

        const getUint32Val = (offset: number): number => {
          if (isByteSwapped) {
            // Read 2 swapped 16-bit words
            const w1 = view.getUint16(offset, false);
            const w2 = view.getUint16(offset + 2, false);
            return (w2 << 16) | w1;
          }
          return view.getUint32(offset, false);
        };

        // Extract header elements
        const clockRate = "0x" + getUint32Val(4).toString(16).toUpperCase();
        const entryPoint = "0x" + getUint32Val(8).toString(16).toUpperCase();
        const crc1 = "0x" + getUint32Val(16).toString(16).toUpperCase();
        const crc2 = "0x" + getUint32Val(20).toString(16).toUpperCase();

        // Extract Title (20 bytes starting at 0x20)
        let title = getCharString(0x20, 20).replace(/[\x00-\x1F]/g, " ");
        if (!title.trim()) {
          title = file.name.substring(0, 20).toUpperCase();
        }

        // Extract Product Code (4 bytes starting at 0x3B/0x3C)
        const productId = getCharString(0x3B, 4).trim() || "N64P";
        
        // Extract version byte
        const version = view.getUint8(0x3F);

        // Map publisher from Product ID
        let publisher = "Desconhecido";
        const pubCode = productId.substring(productId.length - 1);
        const publisherMap: Record<string, string> = {
          "E": "Nintendo (USA)",
          "P": "Nintendo (PAL)",
          "J": "Nintendo (Japan)",
          "D": "Konami / Ultra",
          "A": "Activision",
          "B": "Bandai",
          "C": "Capcom",
          "F": "LJN / Acclaim",
          "G": "Gemu",
          "I": "Igs",
          "H": "Hudson Soft",
          "K": "Kemco",
          "M": "Midway",
          "N": "Namco",
          "S": "Spectrum Holobyte",
          "T": "Taito",
          "U": "Ubi Soft",
          "W": "Williams",
          "Y": "Yojigen",
        };
        publisher = publisherMap[pubCode] || "Nintendo / Licensed Third Party";

        // Country Mapping
        let country = "Internacional";
        const countryChar = productId.substring(productId.length - 1);
        if (countryChar === "E") country = "North America (USA)";
        else if (countryChar === "J") country = "Japan (NTSC-J)";
        else if (countryChar === "P" || countryChar === "D") country = "Europe / Australia (PAL)";

        const romData: RomMetadata = {
          fileName: file.name,
          fileSize: file.size,
          endianness: endian,
          magic: "0x" + magic.toString(16).toUpperCase(),
          clockRate,
          entryPoint,
          crc1,
          crc2,
          title,
          productId,
          version,
          publisher,
          country,
          romFile: file,
        };

        onRomSelected(romData);
        onAddLog("SYS", `ROM Parse com sucesso: "${title.trim()}" - Endianness: ${endian}. Ready to emulate!`, "success");
      } catch (err: any) {
        onAddLog("SYS", `Erro ao analisar ROM: ${err.message}`, "error");
      }
    };

    reader.readAsArrayBuffer(file.slice(0, 64)); // Read first 64 bytes
  };

  const selectVirtualRom = (rom: RomMetadata) => {
    if (soundEnabled) playBeep();
    onRomSelected(rom);
    onAddLog("SYS", `Cartucho virtual inserido: ${rom.title.trim()}`, "success");
  };

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
      parseRomFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id="rom-analyzer" className="bg-slate-950/80 backdrop-blur-md rounded-2xl border border-purple-900/30 p-4 shadow-2xl flex flex-col h-full justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-1.5 border-b border-purple-950 pb-2 mb-3">
          <Database className="w-4 h-4 text-purple-400" />
          Análise de ROM & Cartucho
        </h3>

        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
            dragActive
              ? "border-purple-500 bg-purple-950/20 shadow-lg shadow-purple-500/10"
              : "border-purple-900/20 bg-slate-900/30 hover:border-purple-700/40"
          }`}
        >
          <input
            type="file"
            id="rom-file-upload"
            accept=".z64,.n64,.v64"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            onChange={handleFileUpload}
          />
          <FileUp className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-bounce" />
          <p className="text-xs font-semibold text-gray-200">Arraste sua ROM aqui</p>
          <p className="text-3xs text-purple-400 mt-1">Suporta arquivos .z64, .n64 ou .v64</p>
        </div>

        {/* Selected ROM Info */}
        {currentRom ? (
          <div className="mt-4 bg-slate-900/75 border border-purple-900/20 rounded-xl p-3 space-y-2 relative">
            <div className="absolute top-2 right-2 flex items-center gap-1 text-2xs text-purple-400 font-mono bg-purple-950/40 border border-purple-800/30 rounded px-1.5 py-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              N64 OK
            </div>
            <p className="text-2xs text-purple-400 uppercase font-mono">Cartucho Atual</p>
            <h4 className="text-sm font-bold text-gray-200 truncate">{currentRom.title.trim()}</h4>
            
            <div className="grid grid-cols-2 gap-2 text-2xs font-mono pt-2 border-t border-purple-950">
              <div className="space-y-1">
                <p className="text-gray-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-purple-400" />
                  Tam: <span className="text-gray-200">{(currentRom.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                </p>
                <p className="text-gray-400 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-purple-400" />
                  Clock: <span className="text-gray-200">{currentRom.clockRate}</span>
                </p>
                <p className="text-gray-400 flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-purple-400" />
                  Pub: <span className="text-gray-200 truncate">{currentRom.publisher}</span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-400">
                  Format: <span className="text-gray-200 truncate block max-w-full">{currentRom.endianness.split(" ")[0]}</span>
                </p>
                <p className="text-gray-400">
                  PC: <span className="text-gray-200">{currentRom.entryPoint}</span>
                </p>
                <p className="text-gray-400">
                  Região: <span className="text-gray-200 truncate block max-w-full">{currentRom.country.split(" ")[0]}</span>
                </p>
              </div>
            </div>

            <div className="mt-2 text-3xs font-mono text-purple-400 border-t border-purple-950/40 pt-1.5 flex justify-between">
              <span>CRC1: {currentRom.crc1}</span>
              <span>CRC2: {currentRom.crc2}</span>
            </div>
          </div>
        ) : (
          <div className="mt-3 bg-purple-950/10 border border-purple-900/15 rounded-xl p-3 flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="text-2xs text-purple-300 leading-normal">
              Nenhum cartucho inserido. Você pode arrastar uma ROM real ou selecionar uma das ROMs virtuais pré-configuradas abaixo para jogar ou analisar.
            </p>
          </div>
        )}
      </div>

      {/* Virtual ROM Selection Carousel */}
      <div className="border-t border-purple-950 pt-3">
        <h4 className="text-2xs font-bold text-purple-400 uppercase tracking-wider mb-2 font-mono">
          Cassetes Virtuais Integrados
        </h4>
        <div className="grid grid-cols-2 gap-1.5">
          {VIRTUAL_ROMS.map((rom, idx) => (
            <button
              key={idx}
              onClick={() => selectVirtualRom(rom)}
              className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all border font-mono text-2xs ${
                currentRom?.fileName === rom.fileName
                  ? "bg-purple-900/30 border-purple-500 text-gray-200 shadow shadow-purple-500/10"
                  : "bg-slate-900/50 border-purple-950 hover:bg-purple-950/15 hover:border-purple-900/30 text-gray-400 hover:text-gray-200"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded bg-purple-500 shadow shadow-purple-500/40 shrink-0" />
              <div className="truncate">
                <p className="font-bold truncate">{rom.title.trim()}</p>
                <p className="text-3xs text-purple-500 truncate">{rom.country.split(" ")[0]}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
