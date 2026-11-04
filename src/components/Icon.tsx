import { createElement } from 'react'
import { ICONS, type IconName } from './icons.ts'

interface IconProps {
  name: IconName
  /** 20 לממשק, 16 בתוך תגים (DESIGN.md סעיף 2.7). */
  size?: number
  /** אייקון שמעביר משמעות מקבל תווית. אחרת הוא מוסתר מקוראי מסך. */
  label?: string
  className?: string
}

export function Icon({ name, size = 20, label, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      className={className}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {ICONS[name].map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  )
}

export type { IconName }
