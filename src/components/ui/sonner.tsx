"use client"

import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Top-anchored, not bottom — this app's bottom edge is where BottomNav,
// bottom sheets (servings drawer, remove-member confirm, etc.), and forms'
// primary action buttons all live. A bottom-center toast can render above
// those (sonner's z-index beats a Sheet's), visually covering the exact
// button the toast is telling you about. 160px clears the tallest
// PageHeader in the app (title row + two children rows, e.g. Tonight's
// tabs + shopping toggle) — confirmed by testing that a shorter offset
// still overlapped a recipe page's Cook/Plan/Edit tab row and intercepted
// taps meant for it. Simple single-row headers just get a bit more
// breathing room below the toast, which is a cosmetic tradeoff, not a
// blocked tap.
const TOP_CLEARANCE = 160

const glassToast: React.CSSProperties = {
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  border: '1px solid oklch(100% 0 0 / 0.6)',
  background: 'var(--glass-card)',
  boxShadow: 'oklch(1 0 0 / 0.7) 0px 0px 0px inset, oklch(0.3 0.02 85 / 0.25) 0px 8px 32px -8px',
  color: 'var(--foreground)',
  borderRadius: 14,
}

// Matches BottomNav's column-centering math so the toast lines up with the
// nav on wide viewports instead of drifting to true screen-center.
const COLUMN_INSET = 'max(20px, calc(50% - 310px))'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      duration={3500}
      offset={{ top: TOP_CLEARANCE }}
      mobileOffset={{ top: TOP_CLEARANCE }}
      style={{
        left: COLUMN_INSET,
        right: COLUMN_INSET,
        width: 'auto',
        transform: 'none',
      }}
      icons={{
        success: <CircleCheck className="h-4 w-4" style={{ color: 'var(--teal)' }} />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" style={{ color: 'var(--red)' }} />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        style: { ...glassToast, left: 0, right: 0, margin: '0 auto' },
        actionButtonStyle: {
          background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
          color: '#4A3300',
          fontWeight: 700,
          borderRadius: 10,
          padding: '6px 12px',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
