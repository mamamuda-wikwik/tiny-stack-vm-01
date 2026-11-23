// Tiny stack VM (ISA v1) for make.fun tiny-stack-vm-01. Reads /input/<id>/,
// writes /output/<id>/stdout.bin + exit.txt. 32-bit wrapping ints, 256 stack,
// 64 calls, 256 memory words, 1M steps, 64K output.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const MAXS = 1e6, MAXO = 65536;
const IN_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
function run(P: Buffer, I: Buffer): [Buffer, number] {
  const S = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256), O = Buffer.alloc(MAXO);
  let sp = 0, cp = 0, pc = 0, n = 0, ol = 0, ip = 0, q = 0, ex = 0, a = 0, b = 0, v = 0, end = false;
  const L = P.length, T = (c: number) => { ex = c; end = true; };
  while (!end) {
    if (n >= MAXS) { T(10); break; }
    if (pc < 0 || pc >= L) { T(9); break; }
    const op = P[pc];
    if (op > 7 && (op < 16 || op > 34) && (op < 48 || op > 52) && (op < 64 || op > 65) && (op < 80 || op > 83)) { T(5); break; }
    let il = 0;
    if (op === 1) il = 1; else if (op === 2) il = 4; else if (op >= 48 && op <= 51) il = 2;
    if (pc + 1 + il > L) { T(9); break; }
    n++;
    ip = pc; pc += 1 + il;
    const nx = pc, im = il === 2 ? P[ip + 1] | (P[ip + 2] << 8) : 0;
    switch (op) {
      case 0: ex = 0; end = true; break; // HALT
      case 1: if (sp >= 256) { T(3); break; } S[sp++] = (P[ip + 1] << 24) >> 24; break; // PUSH8
      case 2: if (sp >= 256) { T(3); break; } S[sp++] = P[ip + 1] | (P[ip + 2] << 8) | (P[ip + 3] << 16) | (P[ip + 4] << 24); break; // PUSH32
      case 3: if (sp < 1) { T(2); break; } sp--; break; // POP
      case 4: if (sp < 1) { T(2); break; } if (sp >= 256) { T(3); break; } S[sp] = S[sp - 1]; sp++; break; // DUP
      case 5: if (sp < 2) { T(2); break; } v = S[sp - 1]; S[sp - 1] = S[sp - 2]; S[sp - 2] = v; break; // SWAP
      case 6: if (sp < 2) { T(2); break; } if (sp >= 256) { T(3); break; } S[sp] = S[sp - 2]; sp++; break; // OVER
      case 7: if (sp < 3) { T(2); break; } v = S[sp - 3]; S[sp - 3] = S[sp - 2]; S[sp - 2] = S[sp - 1]; S[sp - 1] = v; break; // ROT
      case 16: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = (S[sp - 1] + b) | 0; break; // ADD
      case 17: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = (S[sp - 1] - b) | 0; break; // SUB
      case 18: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = Math.imul(S[sp - 1], b); break; // MUL
      case 19: if (sp < 2) { T(2); break; } b = S[--sp]; a = S[sp - 1]; if (!b) { T(4); break; } S[sp - 1] = ((a - a % b) / b) | 0; break; // DIV
      case 20: if (sp < 2) { T(2); break; } b = S[--sp]; a = S[sp - 1]; if (!b) { T(4); break; } S[sp - 1] = (a % b) | 0; break; // MOD
      case 21: if (sp < 2) { T(2); break; } b = S[--sp] >>> 0; a = S[sp - 1] >>> 0; if (!b) { T(4); break; } S[sp - 1] = ((a - a % b) / b) | 0; break; // DIVU
      case 22: if (sp < 2) { T(2); break; } b = S[--sp] >>> 0; a = S[sp - 1] >>> 0; if (!b) { T(4); break; } S[sp - 1] = (a % b) | 0; break; // MODU
      case 23: if (sp < 1) { T(2); break; } S[sp - 1] = (-S[sp - 1]) | 0; break; // NEG
      case 24: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = S[sp - 1] & b; break; // AND
      case 25: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = S[sp - 1] | b; break; // OR
      case 26: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = S[sp - 1] ^ b; break; // XOR
      case 27: if (sp < 1) { T(2); break; } S[sp - 1] = ~S[sp - 1]; break; // NOT
      case 28: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = S[sp - 1] << (b & 31); break; // SHL
      case 29: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = S[sp - 1] >> (b & 31); break; // SHR
      case 30: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = (S[sp - 1] >>> (b & 31)) | 0; break; // SHRU
      case 32: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = S[sp - 1] === b ? 1 : 0; break; // EQ
      case 33: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = S[sp - 1] < b ? 1 : 0; break; // LT
      case 34: if (sp < 2) { T(2); break; } b = S[--sp]; S[sp - 1] = (S[sp - 1] >>> 0) < (b >>> 0) ? 1 : 0; break; // LTU
      case 48: pc = nx + ((im << 16) >> 16); break; // JMP
      case 49: if (sp < 1) { T(2); break; } if (S[--sp] === 0) pc = nx + ((im << 16) >> 16); break; // JZ
      case 50: if (sp < 1) { T(2); break; } if (S[--sp] !== 0) pc = nx + ((im << 16) >> 16); break; // JNZ
      case 51: if (cp >= 64) { T(7); break; } C[cp++] = nx; pc = im; break; // CALL
      case 52: if (cp === 0) { T(8); break; } pc = C[--cp]; break; // RET
      case 64: if (sp < 1) { T(2); break; } a = S[sp - 1]; if (a < 0 || a > 255) { T(6); break; } S[sp - 1] = M[a]; break; // LOAD
      case 65: if (sp < 2) { T(2); break; } a = S[sp - 1]; v = S[sp - 2]; if (a < 0 || a > 255) { T(6); break; } M[a] = v; sp -= 2; break; // STORE
      case 80: if (sp < 1) { T(2); break; } { const s = String(S[--sp]); if (ol + s.length > MAXO) { T(11); break; } for (let i = 0; i < s.length; i++) O[ol++] = s.charCodeAt(i); } break; // PRINT
      case 81: if (sp < 1) { T(2); break; } if (ol + 1 > MAXO) { T(11); break; } O[ol++] = S[--sp] & 255; break; // PUTC
      case 82: if (sp >= 256) { T(3); break; } S[sp++] = q < I.length ? I[q++] : -1; break; // IN
      case 83: if (sp < 1) { T(2); break; } ex = S[--sp] & 255; end = true; break; // EXIT
    }
  }
  return [O.subarray(0, ol), ex];
}

const ids = readdirSync(IN_DIR).filter((n) => {
  try { return statSync(join(IN_DIR, n)).isDirectory(); } catch { return false; }
}).sort();
for (const id of ids) {
  let P = Buffer.alloc(0), I = Buffer.alloc(0);
  try { P = readFileSync(join(IN_DIR, id, 'program.bin')); } catch { /* empty program traps 9 */ }
  try { I = readFileSync(join(IN_DIR, id, 'input.bin')); } catch { /* empty input */ }
  let r: [Buffer, number];
  try { r = run(P, I); } catch (e) { console.error('vm error on ' + id + ': ' + String(e)); r = [Buffer.alloc(0), 9]; }
  const d = join(OUT_DIR, id);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'stdout.bin'), r[0]);
  writeFileSync(join(d, 'exit.txt'), String(r[1]));
}
