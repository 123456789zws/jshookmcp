/** Register and guest-memory access passed to host functions and syscall handlers. */
export interface HostContext {
  x(index: number): bigint;
  setX(index: number, value: bigint): void;
  setD(index: number, value: number): void;
  read(address: number, length: number): Uint8Array;
  write(address: number, bytes: Uint8Array): void;
}

export type HostFunction = (ctx: HostContext) => bigint | number | void;
export type SyscallContext = HostContext;
