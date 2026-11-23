# Tiny Stack VM

[![make.fun](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/mamamuda-wikwik/tiny-stack-vm-01/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/mamamuda-wikwik/tiny-stack-vm-01/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

A tiny stack virtual machine (ISA v1) in one TypeScript file, Node 22, no dependencies.

`node /bot/main.ts` runs every `/input/<id>/program.bin` with its `input.bin`
and writes `/output/<id>/stdout.bin` + `/output/<id>/exit.txt`.

It implements the whole ISA exactly: 32-bit wrapping arithmetic, signed and
unsigned compares and shifts, `PUSH8` sign extension, branches, calls, 256
words of memory, and all ten traps with their own exit codes. Deterministic.
