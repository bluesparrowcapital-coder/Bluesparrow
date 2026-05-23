/**
 * DateInput — shows DD/MM/YYYY to the user, emits YYYY-MM-DD internally.
 *
 * Usage:
 *   <DateInput value={isoValue} onChange={(iso) => setValue('dob', iso)} max="2006-05-23" />
 *
 * Works with react-hook-form via Controller or with plain state.
 */

interface DateInputProps {
  value?: string          // YYYY-MM-DD or ''
  onChange: (iso: string) => void
  max?: string            // YYYY-MM-DD
  min?: string            // YYYY-MM-DD
  placeholder?: string
  className?: string
  id?: string
}

/** Convert YYYY-MM-DD → DD/MM/YYYY for display */
function isoToDisplay(iso: string): string {
  if (!iso || iso.length !== 10) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Convert raw digit string (up to 8 digits) → masked display DD/MM/YYYY */
function maskDigits(digits: string): string {
  const d = digits.slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** DD/MM/YYYY → YYYY-MM-DD, returns '' if incomplete/invalid */
function displayToIso(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length !== 8) return ''
  const dd = digits.slice(0, 2)
  const mm = digits.slice(2, 4)
  const yyyy = digits.slice(4, 8)
  // Basic sanity check
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
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value

    // Strip everything except digits, then re-mask
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    const masked = maskDigits(digits)

    // Try to emit ISO if we have 8 digits
    const iso = displayToIso(masked)
    if (iso) {
      // Enforce min/max
      if (max && iso > max) return
      if (min && iso < min) return
      onChange(iso)
    } else {
      // Partial input — emit empty so upstream knows it's incomplete
      onChange('')
    }
  }

  // Show the display version of the ISO value (or empty string for placeholder)
  const displayValue = isoToDisplay(value)

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={10}
      className={`input-field ${className}`}
    />
  )
}
