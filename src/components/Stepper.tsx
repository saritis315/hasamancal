import { Fragment } from 'react'
import { Icon } from './Icon.tsx'

const NAMES = ['תיאור העסק', 'אישור ההצעה', 'העלאת נתונים']

/** מחוון שלבים (DESIGN.md סעיף 3.9): שלב שהושלם בירוק עם וי, שלב נוכחי בנייבי. */
export function Stepper({ step }: { step: number }) {
  return (
    <ol className="stepper" aria-label="שלבי ההקמה">
      {NAMES.map((name, i) => {
        const no = i + 1
        const done = no < step
        return (
          <Fragment key={name}>
            <li className={'step' + (done ? ' is-done' : '')} aria-current={no === step ? 'step' : undefined}>
              <span className="step__dot">{done ? <Icon name="check" size={16} /> : no}</span>
              <span>{name}</span>
              {done && <span className="visually-hidden"> (הושלם)</span>}
            </li>
            {i < NAMES.length - 1 && <li className="step__sep" aria-hidden="true" />}
          </Fragment>
        )
      })}
    </ol>
  )
}
