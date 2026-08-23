import * as React from 'react'

interface IconProps {
  readonly size?: number
  readonly className?: string
}

function icon(
  props: IconProps,
  ...children: React.ReactNode[]
): React.ReactNode {
  return React.createElement('svg', {
    className: props.className,
    width: props.size ?? 16,
    height: props.size ?? 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
  }, ...children)
}

export function IconPulse(props: IconProps = {}): React.ReactNode {
  return icon(props, React.createElement('path', { d: 'M3 12h4l2.2-6 4.1 12 2.2-6H21' }))
}

export function IconSearch(props: IconProps = {}): React.ReactNode {
  return icon(props,
    React.createElement('circle', { cx: 10.8, cy: 10.8, r: 6.8 }),
    React.createElement('path', { d: 'm16 16 4.5 4.5' }),
  )
}

export function IconRefresh(props: IconProps = {}): React.ReactNode {
  return icon(props,
    React.createElement('path', { d: 'M20 11a8 8 0 0 0-14.7-4.3L3 9' }),
    React.createElement('path', { d: 'M3 4v5h5' }),
    React.createElement('path', { d: 'M4 13a8 8 0 0 0 14.7 4.3L21 15' }),
    React.createElement('path', { d: 'M21 20v-5h-5' }),
  )
}

export function IconClose(props: IconProps = {}): React.ReactNode {
  return icon(props,
    React.createElement('path', { d: 'm6 6 12 12' }),
    React.createElement('path', { d: 'm18 6-12 12' }),
  )
}

export function IconChevron(props: IconProps = {}): React.ReactNode {
  return icon(props, React.createElement('path', { d: 'm8 10 4 4 4-4' }))
}

export function IconCopy(props: IconProps = {}): React.ReactNode {
  return icon(props,
    React.createElement('rect', { x: 8, y: 8, width: 11, height: 11, rx: 2 }),
    React.createElement('path', { d: 'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2' }),
  )
}

export function IconFolder(props: IconProps = {}): React.ReactNode {
  return icon(props,
    React.createElement('path', { d: 'M3.5 7.5h6l2 2h9v8.2a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h4l2 2' }),
  )
}

export function IconStop(props: IconProps = {}): React.ReactNode {
  return icon(props, React.createElement('rect', { x: 6, y: 6, width: 12, height: 12, rx: 2 }))
}

export function IconCheck(props: IconProps = {}): React.ReactNode {
  return icon(props, React.createElement('path', { d: 'm5 12 4.2 4.2L19 6.5' }))
}

export function IconInfo(props: IconProps = {}): React.ReactNode {
  return icon(props,
    React.createElement('circle', { cx: 12, cy: 12, r: 8.5 }),
    React.createElement('path', { d: 'M12 10.5v5' }),
    React.createElement('path', { d: 'M12 7.5h.01' }),
  )
}

export function IconLinkSignal(props: IconProps = {}): React.ReactNode {
  return icon(props,
    React.createElement('path', { d: 'm9.5 14.5 5-5' }),
    React.createElement('path', { d: 'M7.2 17.8H6a3.8 3.8 0 0 1 0-7.6h3' }),
    React.createElement('path', { d: 'M16.8 6.2H18a3.8 3.8 0 0 1 0 7.6h-3' }),
  )
}

export function IconEmptyLink(props: IconProps = {}): React.ReactNode {
  return icon(props,
    React.createElement('path', { d: 'm8.5 8.5-1.3 1.3a3.8 3.8 0 0 0 5.4 5.4l1.4-1.4' }),
    React.createElement('path', { d: 'm15.5 15.5 1.3-1.3a3.8 3.8 0 0 0-5.4-5.4L10 10.2' }),
    React.createElement('path', { d: 'm4 4 16 16' }),
  )
}
