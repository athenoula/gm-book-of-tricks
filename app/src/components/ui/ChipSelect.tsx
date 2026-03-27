import { motion } from '@/components/motion'

interface ChipSelectProps {
  options: readonly string[]
  selected: string | string[]
  onChange: (value: string | string[]) => void
  multiple?: boolean
  allowOther?: boolean
  otherValue?: string
  onOtherChange?: (value: string) => void
}

export function ChipSelect({
  options,
  selected,
  onChange,
  multiple = false,
  allowOther = false,
  otherValue = '',
  onOtherChange,
}: ChipSelectProps) {
  const selectedSet = new Set(Array.isArray(selected) ? selected : [selected])

  const handleClick = (option: string) => {
    if (multiple) {
      const current = Array.isArray(selected) ? selected : []
      if (current.includes(option)) {
        onChange(current.filter((v) => v !== option))
      } else {
        onChange([...current, option])
      }
    } else {
      onChange(option)
    }
  }

  const isOtherSelected = selectedSet.has('Other')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedSet.has(option)
          return (
            <motion.button
              key={option}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClick(option)}
              className={`
                px-3 py-1.5 rounded-[--radius-md] text-sm font-medium
                transition-colors duration-[--duration-fast] cursor-pointer
                ${isSelected
                  ? 'bg-primary-ghost border border-primary text-primary-light'
                  : 'bg-bg-raised border border-border text-text-muted hover:text-text-body hover:border-border-hover'
                }
              `}
            >
              {option}
            </motion.button>
          )
        })}
        {allowOther && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => handleClick('Other')}
            className={`
              px-3 py-1.5 rounded-[--radius-md] text-sm font-medium
              transition-colors duration-[--duration-fast] cursor-pointer
              ${isOtherSelected
                ? 'bg-primary-ghost border border-primary text-primary-light'
                : 'bg-bg-raised border border-border text-text-muted hover:text-text-body hover:border-border-hover'
              }
            `}
          >
            Other
          </motion.button>
        )}
      </div>
      {allowOther && isOtherSelected && onOtherChange && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="Please specify..."
          className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm"
        />
      )}
    </div>
  )
}
