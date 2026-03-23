declare module '@3d-dice/dice-box' {
  interface DiceBoxConfig {
    container?: string | null
    assetPath?: string
    theme?: string
    themeColor?: string
    scale?: number
    gravity?: number
    mass?: number
    spinForce?: number
    throwForce?: number
    startingHeight?: number
    settleTimeout?: number
    offscreen?: boolean
    delay?: number
    lightIntensity?: number
    enableShadows?: boolean
    shadowTransparency?: number
    preloadThemes?: string[]
    onBeforeRoll?: (notation: unknown) => void
    onDieComplete?: (result: DieResult) => void
    onRollComplete?: (results: DieResult[]) => void
    onRemoveComplete?: (result: DieResult) => void
    onThemeConfigLoaded?: (data: unknown) => void
    onThemeLoaded?: (data: unknown) => void
    [key: string]: unknown
  }

  interface DieResult {
    groupId: number
    rollId: number
    sides: number
    theme: string
    themeColor: string
    value: number
  }

  export default class DiceBox {
    constructor(config: DiceBoxConfig)
    init(): Promise<void>
    roll(
      notation: string | unknown[],
      options?: { theme?: string; themeColor?: string; newStartPoint?: boolean }
    ): Promise<DieResult[]>
    add(
      notation: string | unknown[],
      options?: { theme?: string; themeColor?: string }
    ): Promise<DieResult[]>
    reroll(
      rolls: DieResult[],
      options?: { remove?: boolean; hide?: boolean; newStartPoint?: boolean }
    ): Promise<DieResult[]>
    clear(): DiceBox
    getRollResults(): DieResult[]
    updateConfig(config: Partial<DiceBoxConfig>): void
  }
}
