import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiRollingDices } from '@/components/ui/icons'
import { AnimatePresence, motion } from '@/components/motion'
import DiceBox from '@3d-dice/dice-box'

const DICE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const
type DiceType = (typeof DICE_TYPES)[number]

interface RollResult {
  id: number
  dice: string
  values: number[]
  total: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function DiceRoller({ isOpen, onClose }: Props) {
  const [quantities, setQuantities] = useState<Record<DiceType, number>>(
    () => Object.fromEntries(DICE_TYPES.map((d) => [d, 0])) as Record<DiceType, number>
  )
  const [results, setResults] = useState<RollResult[]>([])
  const [rolling, setRolling] = useState(false)
  const diceBoxRef = useRef<DiceBox | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)
  const initAttemptedRef = useRef(false)

  useEffect(() => {
    if (!isOpen || !canvasContainerRef.current || initAttemptedRef.current) return

    initAttemptedRef.current = true

    const initDiceBox = async () => {
      const box = new DiceBox({
        container: '#dice-canvas-container',
        assetPath: '/dice-box-assets/',
        theme: 'default',
        scale: 18,
        gravity: 1,
        mass: 1,
        spinForce: 4,
        throwForce: 5,
      })
      await box.init()
      diceBoxRef.current = box
    }

    initDiceBox().catch(console.error)

    return () => {
      if (diceBoxRef.current) {
        diceBoxRef.current.clear()
        diceBoxRef.current = null
      }
      initAttemptedRef.current = false
    }
  }, [isOpen])

  const handleQuantityChange = (die: DiceType, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [die]: Math.max(0, Math.min(20, prev[die] + delta)),
    }))
  }

  const handleRoll = useCallback(async () => {
    if (!diceBoxRef.current || rolling) return

    const notation = DICE_TYPES.filter((d) => quantities[d] > 0)
      .map((d) => `${quantities[d]}${d}`)
      .join('+')

    if (!notation) return

    setRolling(true)

    try {
      const result = await diceBoxRef.current.roll(notation)
      const values = result.map((r) => r.value)
      const total = values.reduce((sum, v) => sum + v, 0)

      setResults((prev) => [
        {
          id: nextId.current++,
          dice: notation,
          values,
          total,
        },
        ...prev.slice(0, 19),
      ])
    } catch (err) {
      console.error('Dice roll error:', err)
    } finally {
      setRolling(false)
    }
  }, [quantities, rolling])

  const handleClear = () => {
    setQuantities(Object.fromEntries(DICE_TYPES.map((d) => [d, 0])) as Record<DiceType, number>)
    if (diceBoxRef.current) diceBoxRef.current.clear()
  }

  const hasDice = DICE_TYPES.some((d) => quantities[d] > 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed top-0 right-0 bottom-0 w-[350px] bg-bg-base border-l border-border z-[45] flex flex-col shadow-lg"
          initial={{ x: 350 }}
          animate={{ x: 0 }}
          exit={{ x: 350 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <GameIcon icon={GiRollingDices} size="sm" className="text-primary-light" />
              <h3 className="text-sm font-medium text-text-heading" style={{ fontFamily: 'var(--font-heading)' }}>
                Dice Roller
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-body cursor-pointer text-lg leading-none"
              aria-label="Close dice roller"
            >
              ✕
            </button>
          </div>

          {/* Dice selector */}
          <div className="px-4 py-3 border-b border-border">
            <div className="grid grid-cols-4 gap-2">
              {DICE_TYPES.map((die) => (
                <div key={die} className="text-center">
                  <div className="text-[10px] text-text-muted mb-1 font-label uppercase tracking-wide">
                    {die}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleQuantityChange(die, -1)}
                      className="w-6 h-6 rounded bg-bg-raised text-text-muted hover:text-text-body text-xs cursor-pointer transition-colors"
                    >
                      -
                    </button>
                    <span
                      className={`w-6 text-center text-sm font-mono tabular-nums ${
                        quantities[die] > 0 ? 'text-primary-light font-bold' : 'text-text-muted'
                      }`}
                    >
                      {quantities[die]}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(die, 1)}
                      className="w-6 h-6 rounded bg-bg-raised text-text-muted hover:text-text-body text-xs cursor-pointer transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleRoll} disabled={!hasDice || rolling} className="flex-1">
                {rolling ? 'Rolling...' : 'Roll'}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>

          {/* 3D canvas */}
          <div
            id="dice-canvas-container"
            ref={canvasContainerRef}
            className="h-[200px] bg-bg-deep relative"
          />

          {/* Roll history */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {results.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-6">Roll some dice!</p>
            ) : (
              <div className="space-y-2">
                {results.map((roll, i) => (
                  <div
                    key={roll.id}
                    className={`rounded-[--radius-md] p-2 ${
                      i === 0
                        ? 'bg-primary-ghost border border-primary/20'
                        : 'bg-bg-raised'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted font-mono">{roll.dice}</span>
                      <span
                        className={`font-mono font-bold ${
                          i === 0 ? 'text-primary-light text-lg' : 'text-text-heading text-sm'
                        }`}
                      >
                        {roll.total}
                      </span>
                    </div>
                    {roll.values.length > 1 && (
                      <div className="text-[10px] text-text-muted mt-0.5">
                        [{roll.values.join(', ')}]
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
