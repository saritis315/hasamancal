import { useEffect, type RefObject } from 'react'

/** אחרי שליחה עם שגיאות: מעביר פוקוס לשדה הראשון שסומן aria-invalid, אחרי שה-DOM התעדכן. */
export function useFocusInvalid(errors: object, root?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!Object.values(errors).some(Boolean)) return
    ;(root?.current ?? document).querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors, root])
}
