/**
 * DateInput — shows DD/MM/YYYY text input + calendar picker icon.
 * Emits YYYY-MM-DD internally via onChange.
 */

import { useRef, useState, useEffect } from 'react'
import { CalendarDays } from 'lucide-react'

interface DateInputProps {
  value?: string          // YYYY-MM-DD or ''
  onChange: (iso: string) => void
  max?: string            // YYYY-MM-DD
  min?: string            // YYYY-MM-DD
  placeholder?: string
  className?: string
  id?: string
}

function isoToDisplay(iso: string): string {
  if (!iso || iso.length !== 10) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function maskDigits(digits: string): string {
  const d = digits.slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

function displayToIso(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length !== 8) return ''
  const dd = digits.slice(0, 2)
  const mm = digits.slice(2, 4)
  const yyyy = digits.slice(4, 8)
  const d = Number(dd), mo = Number(mm), y = Number(yyyy)
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900) return ''
  return `${yyyy}-${mm}-${dd}`
}

export default function DateInput({
  value = '',
  onChange,
  max,
  min,
  placeholder = 'DD/MM/YYYY',
  className = '',
  id,
}: DateInputProps) {
  // Internal display state so partial typing isn't wiped out
  const [display, setDisplay] = useState(() => isoToDisplay(value))
  const calendarRef = useRef<HTMLInputElement>(null)

  // Sync display when parent resets value (e.g. form reset / prefill)
  useEffect(() => {
    setDisplay(isoToDisplay(value))
  }, [value])

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    const masked = maskDigits(digits)
    setDisplay(masked)

    const iso = displayToIso(masked)
    if (iso) {
      if (max && iso > max) return
      if (min && iso < min) return
      onChange(iso)
    } else {
      onChange('')
    }
  }

  function handleCalendarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value   // already YYYY-MM-DD
    if (!iso) return
    setDisplay(isoToDisplay(iso))
    onChange(iso)
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleTextChange}
        placeholder={placeholder}
        maxLength={10}
        className="input-field pr-10 w-full"
      />
      {/* Hidden native date picker — opens on calendar icon click */}
      <input
        ref={calendarRef}
        type="date"
        tabIndex={-1}
        value={value}
        min={min}
        max={max}
        onChange={handleCalendarChange}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-none"
        style={{ zIndex: -1 }}
      />
      <button
        type="button"
        onClick={() => calendarRef.current?.showPicker?.()}
        className="absolute right-2 text-slate-400 hover:text-sparrow-blue transition-colors"
        tabIndex={-1}
        aria-label="Open calendar"
      >
        <CalendarDays size={18} />
      </button>
    </div>
  )
}
