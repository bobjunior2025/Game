/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MipsRegister } from "../types";

// Setup 32 MIPS registers
export const INITIAL_REGISTERS: MipsRegister[] = [
  { name: "$r0", alias: "$zero", value: 0, description: "Sempre zero (Hardwired)" },
  { name: "$r1", alias: "$at", value: 0, description: "Assembler Temporary (Uso interno)" },
  { name: "$r2", alias: "$v0", value: 0, description: "Valor de retorno 0" },
  { name: "$r3", alias: "$v1", value: 0, description: "Valor de retorno 1" },
  { name: "$r4", alias: "$a0", value: 0, description: "Argumento de função 0" },
  { name: "$r5", alias: "$a1", value: 0, description: "Argumento de função 1" },
  { name: "$r6", alias: "$a2", value: 0, description: "Argumento de função 2" },
  { name: "$r7", alias: "$a3", value: 0, description: "Argumento de função 3" },
  { name: "$r8", alias: "$t0", value: 0, description: "Temporário 0 (Não preservado)" },
  { name: "$r9", alias: "$t1", value: 0, description: "Temporário 1 (Não preservado)" },
  { name: "$r10", alias: "$t2", value: 0, description: "Temporário 2 (Não preservado)" },
  { name: "$r11", alias: "$t3", value: 0, description: "Temporário 3 (Não preservado)" },
  { name: "$r12", alias: "$t4", value: 0, description: "Temporário 4 (Não preservado)" },
  { name: "$r13", alias: "$t5", value: 0, description: "Temporário 5 (Não preservado)" },
  { name: "$r14", alias: "$t6", value: 0, description: "Temporário 6 (Não preservado)" },
  { name: "$r15", alias: "$t7", value: 0, description: "Temporário 7 (Não preservado)" },
  { name: "$r16", alias: "$s0", value: 0, description: "Registrador salvo 0" },
  { name: "$r17", alias: "$s1", value: 0, description: "Registrador salvo 1" },
  { name: "$r18", alias: "$s2", value: 0, description: "Registrador salvo 2" },
  { name: "$r19", alias: "$s3", value: 0, description: "Registrador salvo 3" },
  { name: "$r20", alias: "$s4", value: 0, description: "Registrador salvo 4" },
  { name: "$r21", alias: "$s5", value: 0, description: "Registrador salvo 5" },
  { name: "$r22", alias: "$s6", value: 0, description: "Registrador salvo 6" },
  { name: "$r23", alias: "$s7", value: 0, description: "Registrador salvo 7" },
  { name: "$r24", alias: "$t8", value: 0, description: "Temporário 8 (Não preservado)" },
  { name: "$r25", alias: "$t9", value: 0, description: "Temporário 9 (Não preservado)" },
  { name: "$r26", alias: "$k0", value: 0, description: "Reservado para Kernel do SO 0" },
  { name: "$r27", alias: "$k1", value: 0, description: "Reservado para Kernel do SO 1" },
  { name: "$r28", alias: "$gp", value: 268435456, description: "Global Pointer (Início do heap)" },
  { name: "$r29", alias: "$sp", value: 1048576, description: "Stack Pointer (Pilha descendente)" },
  { name: "$r30", alias: "$fp", value: 1048576, description: "Frame Pointer" },
  { name: "$r31", alias: "$ra", value: 0, description: "Return Address (Endereço de retorno)" },
];

export interface MipsInstruction {
  address: number;
  label?: string;
  sourceCode: string;
  opcode: string;
  args: string[];
  binaryHex: string;
}

export class MipsVm {
  registers: number[] = new Array(32).fill(0);
  pc: number = 0; // Program Counter
  hi: number = 0;
  lo: number = 0;
  memory: Uint8Array = new Uint8Array(2048); // Simple scratchpad memory (2KB)
  vram: Uint8Array = new Uint8Array(64 * 48); // VRAM (64x48 pixels)
  instructions: MipsInstruction[] = [];
  labels: Record<string, number> = {};
  logs: string[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.registers = INITIAL_REGISTERS.map(r => r.value);
    this.pc = 0x80000400; // Standard N64 Entry point
    this.hi = 0;
    this.lo = 0;
    this.memory.fill(0);
    this.vram.fill(0);
    this.logs = ["CPU Inicializada: VR4300 em modo 64-bit."];
  }

  // Get index of register by name or alias
  getRegisterIndex(name: string): number {
    const clean = name.trim().toLowerCase();
    if (clean === "$zero" || clean === "$0" || clean === "$r0") return 0;
    const index = INITIAL_REGISTERS.findIndex(
      r => r.name.toLowerCase() === clean || r.alias.toLowerCase() === clean
    );
    return index !== -1 ? index : 0;
  }

  getRegisterValue(name: string): number {
    const idx = this.getRegisterIndex(name);
    return idx === 0 ? 0 : this.registers[idx];
  }

  setRegisterValue(name: string, val: number) {
    const idx = this.getRegisterIndex(name);
    if (idx !== 0) {
      this.registers[idx] = val | 0; // Bound to 32-bit signed integer
    }
  }

  // Parses source code into instruction blocks
  assemble(sourceCode: string) {
    this.reset();
    this.instructions = [];
    this.labels = {};

    const lines = sourceCode.split("\n");
    let currentAddress = 0x80000400;

    // First Pass: Extract Labels and addresses
    const cleanedLines: { address: number; label?: string; code: string }[] = [];
    for (let line of lines) {
      line = line.split("#")[0].split(";")[0].trim(); // Strip comments
      if (!line) continue;

      let label: string | undefined;
      if (line.includes(":")) {
        const parts = line.split(":");
        label = parts[0].trim();
        line = parts.slice(1).join(":").trim();
        this.labels[label] = currentAddress;
      }

      if (line || label) {
        cleanedLines.push({
          address: currentAddress,
          label,
          code: line,
        });
        if (line) {
          currentAddress += 4; // Each instruction is 4 bytes
        }
      }
    }

    // Second Pass: Parse instructions & generate mock hex opcodes
    for (const item of cleanedLines) {
      if (!item.code) continue;

      const firstSpace = item.code.search(/\s/);
      let opcode = "";
      let argsStr = "";

      if (firstSpace === -1) {
        opcode = item.code.toLowerCase();
      } else {
        opcode = item.code.slice(0, firstSpace).toLowerCase();
        argsStr = item.code.slice(firstSpace).trim();
      }

      const args = argsStr ? argsStr.split(",").map(a => a.trim()) : [];
      
      // Compute a fake but plausible hex machine instruction code based on opcode
      const opMap: Record<string, string> = {
        add: "00", sub: "01", addi: "08", li: "09", lui: "0F",
        lw: "23", sw: "2B", and: "02", or: "03", beq: "04",
        bne: "05", j: "02", jal: "03", jr: "08", nop: "00"
      };
      
      const opHex = opMap[opcode] || "3F"; // Default or custom opcode
      const argHex = args.length > 0 ? (Math.abs(args[0].hashCode()) % 256).toString(16).padStart(2, "0") : "00";
      const immHex = args.length > 1 ? (Math.abs(args[1].hashCode()) % 65536).toString(16).padStart(4, "0") : "0000";
      const binaryHex = `0x${opHex}${argHex}${immHex}`.toUpperCase();

      this.instructions.push({
        address: item.address,
        label: item.label,
        sourceCode: item.code,
        opcode,
        args,
        binaryHex,
      });
    }

    this.logs.push(`Montagem concluída: ${this.instructions.length} instruções carregadas na memória.`);
    return this.instructions;
  }

  // Executes one instruction at the current PC
  step(): boolean {
    if (this.instructions.length === 0) return false;

    const instIdx = this.instructions.findIndex(i => i.address === this.pc);
    if (instIdx === -1) {
      this.logs.push(`Erro: PC fora dos limites da memória (PC: 0x${this.pc.toString(16).toUpperCase()})`);
      return false;
    }

    const inst = this.instructions[instIdx];
    let nextPc = this.pc + 4;
    const { opcode, args } = inst;

    try {
      switch (opcode) {
        case "nop":
          // Do nothing
          break;

        case "li": {
          // li $rd, immediate
          if (args.length < 2) throw new Error("li requer registrador e imediato");
          const rd = args[0];
          const imm = parseInt(args[1], 10);
          this.setRegisterValue(rd, imm);
          break;
        }

        case "lui": {
          // lui $rt, immediate
          if (args.length < 2) throw new Error("lui requer registrador e imediato");
          const rt = args[0];
          const imm = parseInt(args[1], 10);
          this.setRegisterValue(rt, imm << 16);
          break;
        }

        case "add":
        case "addu": {
          // add $rd, $rs, $rt
          if (args.length < 3) throw new Error("add requer rd, rs, rt");
          const rd = args[0];
          const val1 = this.getRegisterValue(args[1]);
          const val2 = this.getRegisterValue(args[2]);
          this.setRegisterValue(rd, val1 + val2);
          break;
        }

        case "sub":
        case "subu": {
          // sub $rd, $rs, $rt
          if (args.length < 3) throw new Error("sub requer rd, rs, rt");
          const rd = args[0];
          const val1 = this.getRegisterValue(args[1]);
          const val2 = this.getRegisterValue(args[2]);
          this.setRegisterValue(rd, val1 - val2);
          break;
        }

        case "addi":
        case "addiu": {
          // addi $rt, $rs, immediate
          if (args.length < 3) throw new Error("addi requer rt, rs, imediato");
          const rt = args[0];
          const val1 = this.getRegisterValue(args[1]);
          const imm = parseInt(args[2], 10);
          this.setRegisterValue(rt, val1 + imm);
          break;
        }

        case "and": {
          if (args.length < 3) throw new Error("and requer rd, rs, rt");
          const rd = args[0];
          const val1 = this.getRegisterValue(args[1]);
          const val2 = this.getRegisterValue(args[2]);
          this.setRegisterValue(rd, val1 & val2);
          break;
        }

        case "or": {
          if (args.length < 3) throw new Error("or requer rd, rs, rt");
          const rd = args[0];
          const val1 = this.getRegisterValue(args[1]);
          const val2 = this.getRegisterValue(args[2]);
          this.setRegisterValue(rd, val1 | val2);
          break;
        }

        case "j": {
          // j label
          if (args.length < 1) throw new Error("j requer rótulo");
          const target = args[0];
          if (this.labels[target] !== undefined) {
            nextPc = this.labels[target];
          } else {
            const addr = parseInt(target, 16);
            if (!isNaN(addr)) nextPc = addr;
            else throw new Error(`Rótulo não encontrado: ${target}`);
          }
          break;
        }

        case "jal": {
          // jal label (Jump and Link)
          if (args.length < 1) throw new Error("jal requer rótulo");
          const target = args[0];
          this.setRegisterValue("$ra", this.pc + 4); // Store return address
          if (this.labels[target] !== undefined) {
            nextPc = this.labels[target];
          } else {
            const addr = parseInt(target, 16);
            if (!isNaN(addr)) nextPc = addr;
            else throw new Error(`Rótulo não encontrado: ${target}`);
          }
          break;
        }

        case "jr": {
          // jr $rs (Jump Register)
          if (args.length < 1) throw new Error("jr requer registrador");
          const target = args[0];
          nextPc = this.getRegisterValue(target);
          break;
        }

        case "beq": {
          // beq $rs, $rt, label
          if (args.length < 3) throw new Error("beq requer rs, rt, rótulo");
          const val1 = this.getRegisterValue(args[0]);
          const val2 = this.getRegisterValue(args[1]);
          const target = args[2];
          if (val1 === val2) {
            if (this.labels[target] !== undefined) {
              nextPc = this.labels[target];
            } else {
              const offset = parseInt(target, 10);
              if (!isNaN(offset)) nextPc = this.pc + 4 + (offset * 4);
              else throw new Error(`Rótulo não encontrado: ${target}`);
            }
          }
          break;
        }

        case "bne": {
          // bne $rs, $rt, label
          if (args.length < 3) throw new Error("bne requer rs, rt, rótulo");
          const val1 = this.getRegisterValue(args[0]);
          const val2 = this.getRegisterValue(args[1]);
          const target = args[2];
          if (val1 !== val2) {
            if (this.labels[target] !== undefined) {
              nextPc = this.labels[target];
            } else {
              const offset = parseInt(target, 10);
              if (!isNaN(offset)) nextPc = this.pc + 4 + (offset * 4);
              else throw new Error(`Rótulo não encontrado: ${target}`);
            }
          }
          break;
        }

        case "sw": {
          // sw $rt, offset($rs)
          // Also supports: sw $rt, address (for simulated frame-buffer / pixel drawing!)
          // Custom hardware hooks for N64 simulator:
          // Memory address range: 0x2000 to 0x2C00 represents VRAM (pixel buffer of 64x48 = 3072 cells)
          if (args.length < 2) throw new Error("sw requer rt, endereço");
          const rtVal = this.getRegisterValue(args[0]);
          let targetAddr = 0;

          // Parse offset($rs) pattern e.g., 0($t0)
          const match = args[1].match(/^(-?\d+)\((.+)\)$/);
          if (match) {
            const offset = parseInt(match[1], 10);
            const baseVal = this.getRegisterValue(match[2]);
            targetAddr = baseVal + offset;
          } else {
            targetAddr = parseInt(args[1], 10);
            if (isNaN(targetAddr)) {
              targetAddr = this.getRegisterValue(args[1]);
            }
          }

          // Virtual video hooks (N64 VI / Framebuffer mapping)
          // Let's say vram start is offset 0x0
          if (targetAddr >= 0 && targetAddr < this.vram.length) {
            this.vram[targetAddr] = rtVal & 0xFF; // Write color index (0-255) to frame buffer
          } else if (targetAddr >= 0x80000000 && targetAddr < 0x80000800) {
            // Mapping RDRAM
            const ramOffset = targetAddr - 0x80000000;
            this.memory[ramOffset % this.memory.length] = rtVal & 0xFF;
          }
          break;
        }

        case "lw": {
          // lw $rt, offset($rs)
          if (args.length < 2) throw new Error("lw requer rt, endereço");
          const rt = args[0];
          let targetAddr = 0;

          const match = args[1].match(/^(-?\d+)\((.+)\)$/);
          if (match) {
            const offset = parseInt(match[1], 10);
            const baseVal = this.getRegisterValue(match[2]);
            targetAddr = baseVal + offset;
          } else {
            targetAddr = parseInt(args[1], 10);
            if (isNaN(targetAddr)) {
              targetAddr = this.getRegisterValue(args[1]);
            }
          }

          let value = 0;
          if (targetAddr >= 0 && targetAddr < this.vram.length) {
            value = this.vram[targetAddr];
          } else if (targetAddr >= 0x80000000 && targetAddr < 0x80000800) {
            const ramOffset = targetAddr - 0x80000000;
            value = this.memory[ramOffset % this.memory.length];
          }
          this.setRegisterValue(rt, value);
          break;
        }

        default:
          throw new Error(`Instrução ou opcode não implementado: ${opcode}`);
      }

      // Enforce hardwired zero register rule
      this.registers[0] = 0;
      this.pc = nextPc;
      return true;
    } catch (err: any) {
      this.logs.push(`Erro no PC [0x${this.pc.toString(16).toUpperCase()}]: ${err.message}`);
      return false;
    }
  }
}

// Simple hash code helper to generate mock opcodes
declare global {
  interface String {
    hashCode(): number;
  }
}

String.prototype.hashCode = function () {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    const chr = this.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
};
