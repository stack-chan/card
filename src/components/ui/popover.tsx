import * as React from 'react'

interface PopoverProps {
  open: boolean
  onOpenChange: (value: boolean) => void
  label: string
  trigger: React.ReactElement
  children: React.ReactNode
  side?: 'top' | 'bottom'
  align?: 'start' | 'end'
}
/** Browser popover primitive, styled with the same tokens as the shadcn-derived controls.
 * Uses the native top layer/light dismissal instead of a custom positioning or focus engine.
 */
export function Popover({ open, onOpenChange, label, trigger, children, side = 'bottom', align = 'end' }: PopoverProps) {
  const id = `popover-${React.useId().replace(/:/g, '')}`
  const panel = React.useRef<HTMLDivElement>(null)
  const anchor = React.useRef<HTMLSpanElement>(null)
  const latestChange = React.useRef(onOpenChange)
  latestChange.current = onOpenChange
  const place = React.useCallback(() => {
    const node = panel.current, trigger = anchor.current
    if (!node || !trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewport = window.visualViewport
    const leftEdge = viewport?.offsetLeft ?? 0, topEdge = viewport?.offsetTop ?? 0
    const vw = viewport?.width ?? window.innerWidth, vh = viewport?.height ?? window.innerHeight
    const gutter = 12, gap = 8
    node.style.maxHeight = `${vh - 2 * gutter}px`
    node.style.maxWidth = `${vw - 2 * gutter}px`
    const width = node.offsetWidth, height = node.offsetHeight
    const rawX = align === 'end' ? rect.right - width : rect.left
    const below = rect.bottom + gap, above = rect.top - gap - height
    let y = side === 'top' ? above : below
    if (side === 'top' && above < topEdge + gutter) y = below
    if (side === 'bottom' && below + height > topEdge + vh - gutter) y = above
    node.style.left = `${Math.max(leftEdge + gutter, Math.min(rawX, leftEdge + vw - width - gutter))}px`
    node.style.top = `${Math.max(topEdge + gutter, Math.min(y, topEdge + vh - height - gutter))}px`
  }, [align, side])
  React.useLayoutEffect(() => {
    const node = panel.current!
    node.setAttribute('popover', 'auto')
    const toggle = () => {
      const shown = node.matches(':popover-open')
      latestChange.current(shown)
    }
    node.addEventListener('toggle', toggle)
    return () => node.removeEventListener('toggle', toggle)
  }, [])
  React.useLayoutEffect(() => {
    const node = panel.current!
    if (open && !node.matches(':popover-open')) {
      node.showPopover()
      place()
      node.focus({ preventScroll: true })
    } else if (!open && node.matches(':popover-open')) node.hidePopover()
    if (!open) return
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    window.visualViewport?.addEventListener('resize', place)
    const observer = new ResizeObserver(place)
    observer.observe(node)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      window.visualViewport?.removeEventListener('resize', place)
    }
  }, [open, place])
  const closeWithKeyboard = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    onOpenChange(false)
    anchor.current?.querySelector('button')?.focus()
  }
  return <>
    <span ref={anchor} className="popover-anchor">{React.cloneElement(trigger, {
      'aria-haspopup': 'dialog', 'aria-expanded': open, 'aria-controls': id,
      onClick: () => onOpenChange(!open),
    })}</span>
    <div ref={panel} id={id} className="ui-popover" role="dialog" aria-label={label} tabIndex={-1} onKeyDown={closeWithKeyboard}>{children}</div>
  </>
}
