export const getEffectiveCyclesPerSecond = (cycleSetting: number) => {
  if (cycleSetting < 0) {
    return 1 / Math.abs(cycleSetting)
  }

  return cycleSetting
}

export const formatCycleSetting = (cycleSetting: number) => {
  if (cycleSetting < 0) {
    return `${Math.abs(cycleSetting).toFixed(1)}s loop`
  }

  return `${cycleSetting.toFixed(2)} cps`
}

