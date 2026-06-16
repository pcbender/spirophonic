export const minCyclesPerSecond = 0.01

export const maxCyclesPerSecond = 2

export const getEffectiveCyclesPerSecond = (cyclesPerSecond: number) =>
  clampCyclesPerSecond(cyclesPerSecond)

export const clampCyclesPerSecond = (cyclesPerSecond: number) =>
  Math.min(maxCyclesPerSecond, Math.max(minCyclesPerSecond, cyclesPerSecond))

export const formatCycleSetting = (cyclesPerSecond: number) =>
  `${clampCyclesPerSecond(cyclesPerSecond).toFixed(2)} cps (${formatLoopSeconds(
    cyclesPerSecond,
  )})`

const formatLoopSeconds = (cyclesPerSecond: number) =>
  `${(1 / clampCyclesPerSecond(cyclesPerSecond)).toFixed(1)}s loop`
