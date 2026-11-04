import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon.tsx'

const NOTICE_ICON: Record<NoticeType, IconName> = {
  info: 'info-circle', success: 'check', warning: 'alert-triangle', error: 'circle-x',
}
export type NoticeType = 'info' | 'success' | 'warning' | 'error'

/** הודעה (DESIGN.md סעיף 3.4): אייקון, ומשפט אחד עם פתיחה מודגשת. */
export function Notice({ type, title, children }: { type: NoticeType; title?: string; children?: ReactNode }) {
  return (
    <div className={'notice notice--' + type} role={type === 'error' ? 'alert' : 'status'}>
      <span className="notice__icon"><Icon name={NOTICE_ICON[type]} /></span>
      <div>
        {title && <strong>{title}</strong>}
        {title && children ? ' ' : null}
        {children}
      </div>
    </div>
  )
}
