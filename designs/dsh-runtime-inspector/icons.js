function IconBase({ children, size = 16, viewBox = '0 0 24 24', className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox={viewBox} fill="none" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

function IconPulse(props) {
  return <IconBase {...props}><path d="M3 12h4l2.2-6 4.2 12 2.1-6H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></IconBase>
}

function IconSearch(props) {
  return <IconBase {...props}><circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></IconBase>
}

function IconRefresh(props) {
  return <IconBase {...props}><path d="M19.2 8.4A7.5 7.5 0 0 0 5.1 6.2L3.5 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.5 4.5V8h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M4.8 15.6a7.5 7.5 0 0 0 14.1 2.2l1.6-1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M20.5 19.5V16H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></IconBase>
}

function IconClose(props) {
  return <IconBase {...props}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></IconBase>
}

function IconChevron(props) {
  return <IconBase {...props}><path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></IconBase>
}

function IconCopy(props) {
  return <IconBase {...props}><rect x="8" y="8" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><path d="M6 15H5.5A1.5 1.5 0 0 1 4 13.5v-9A1.5 1.5 0 0 1 5.5 3h8A1.5 1.5 0 0 1 15 4.5V5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></IconBase>
}

function IconFolder(props) {
  return <IconBase {...props}><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l1.7 1.8h8.3A1.5 1.5 0 0 1 20.5 9.3v7.2A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></IconBase>
}

function IconStop(props) {
  return <IconBase {...props}><rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" /></IconBase>
}

function IconExternal(props) {
  return <IconBase {...props}><path d="M14 5h5v5M19 5l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 13.5v4A1.5 1.5 0 0 1 16.5 19h-10A1.5 1.5 0 0 1 5 17.5v-10A1.5 1.5 0 0 1 6.5 6h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></IconBase>
}

function IconCheck(props) {
  return <IconBase {...props}><path d="m5 12.5 4.2 4.2L19.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>
}

function IconInfo(props) {
  return <IconBase {...props}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" /><path d="M12 10.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="7.5" r="1" fill="currentColor" /></IconBase>
}

function IconLinkSignal(props) {
  return <IconBase {...props}><path d="M9.5 14.5 8 16a3.2 3.2 0 0 1-4.5-4.5l2.2-2.2a3.2 3.2 0 0 1 4.5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="m14.5 9.5 1.5-1.5a3.2 3.2 0 1 1 4.5 4.5l-2.2 2.2a3.2 3.2 0 0 1-4.5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="m8.5 15.5 7-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></IconBase>
}

function IconEmptyLink(props) {
  return <IconBase {...props}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" strokeDasharray="2.2 2.2" /><path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></IconBase>
}

function IconChevronDown(props) {
  return <IconBase {...props}><path d="m6.5 9 5.5 5.5L17.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></IconBase>
}

Object.assign(window, {
  IconCheck,
  IconChevron,
  IconChevronDown,
  IconClose,
  IconCopy,
  IconEmptyLink,
  IconExternal,
  IconFolder,
  IconInfo,
  IconLinkSignal,
  IconPulse,
  IconRefresh,
  IconSearch,
  IconStop,
})
