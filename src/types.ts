/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RomMetadata {
  fileName: string;
  fileSize: number;
  endianness: "Big Endian (z64)" | "Little Endian (n64)" | "Mixed Endian (v64)" | "Unknown";
  magic: string;
  clockRate: string;
  entryPoint: string;
  crc1: string;
  crc2: string;
  title: string;
  productId: string;
  version: number;
  publisher: string;
  country: string;
  romFile?: File; // Stores the actual uploaded File object for the real emulator
}

export interface MipsRegister {
  name: string;
  alias: string;
  value: number;
  description: string;
}

export interface AssemblyPreset {
  name: string;
  description: string;
  code: string;
}

export interface ConsoleLog {
  timestamp: string;
  module: "CPU" | "RSP" | "RDP" | "VI" | "SYS" | "AI";
  message: string;
  type: "info" | "warning" | "success" | "error";
}

export interface GameHighScore {
  game: string;
  score: number;
  date: string;
}
