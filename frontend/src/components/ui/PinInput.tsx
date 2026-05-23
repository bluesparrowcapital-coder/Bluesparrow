import { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { clsx } from 'clsx'

interface PinInputProps {
  length?: number
  value: string
  onChange: (val: string) => void
  error?: string
  disabled?: boolean
}

export function PinInput({ length = 4, value, onChange, error, disabled }: PinInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  const digits = value.padEnd(length, '').split('').slice(0, length)

  function handleChange(index: number, char: string) {
    if (!/^\d$/.test(char)) return
    const next = [...digits]
    next[index] = char
    onChange(next.join(''))
    if (index < length - 1) inputs.current[index + 1]?.focus()
  }

  function handleKey(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const next = [...digits]
      if (next[index]) {
        next[index] = ''
        onChange(next.join(''))
      } else if (index > 0) {
        inputs.current[index - 1]?.focus()
        const prev = [...digits]
        prev[index - 1] = ''
        onChange(prev.join(''))
      }
    }
  }

  function handlePaste(e: ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(text.padEnd(length, ''))
    inputs.current[Math.min(text.length, length - 1)]?.focus()
  }

  return (
    <div>
      <div className="flex gap-3 justify-center">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digits[i] || ''}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            className={clsx(
              'w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition',
              'focus:border-sparrow-blue focus:ring-2 focus:ring-sparrow-blue/20',
              error ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          />
        ))}
      </div>
      {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
    </div>
  )
}
