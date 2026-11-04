interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label?: string
}

/** פילטר מקוטע (DESIGN.md סעיף 3.7). */
export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="segmented__item" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
