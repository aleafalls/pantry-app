'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const SCANNER_ELEMENT_ID = 'barcode-scanner-region'

interface Props {
  open: boolean
  onClose: () => void
  onScan: (barcode: string) => void
}

export default function BarcodeScanner({ open, onClose, onScan }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
      ],
      verbose: false,
    })
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 260, height: 160 } },
      decodedText => {
        if (cancelled) return
        cancelled = true
        onScan(decodedText)
      },
      () => { /* per-frame miss — fires constantly while aiming, expected */ }
    ).then(() => {
      if (!cancelled) setPermissionDenied(false)
    }).catch(() => {
      if (!cancelled) setPermissionDenied(true)
    })

    return () => {
      cancelled = true
      const s = scannerRef.current
      scannerRef.current = null
      if (s?.isScanning) {
        s.stop().then(() => s.clear()).catch(() => {})
      } else {
        s?.clear()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-runs on open/close, not on callback identity
  }, [open])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'oklch(97% 0.006 85)',
        display: 'flex', flexDirection: 'column',
        padding: '28px 24px max(24px, env(safe-area-inset-bottom))',
      }}
    >
      <h2 className="text-lg font-extrabold text-center mb-1" style={{ color: 'var(--foreground)' }}>
        Scan a barcode
      </h2>
      <p className="text-sm text-center mb-4" style={{ color: 'var(--muted)' }}>
        Point your camera at the barcode.
      </p>

      {permissionDenied ? (
        <div className="rounded-2xl px-4 py-8 text-center" style={{ background: 'var(--surface)', flex: 1 }}>
          <i className="fi-rr-camera-viewfinder" style={{ fontSize: 32, display: 'block', margin: '0 auto 10px', color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Camera access needed for scanning. You can still add items by typing.
          </p>
        </div>
      ) : (
        <div
          id={SCANNER_ELEMENT_ID}
          style={{ borderRadius: 20, overflow: 'hidden', background: '#000', flex: 1, width: '100%' }}
        />
      )}

      <button
        type="button"
        onClick={onClose}
        style={{
          marginTop: 16, width: '100%', padding: '14px', flexShrink: 0,
          borderRadius: 12, border: '1.5px solid var(--divider)', background: 'none',
          color: 'var(--foreground)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  )
}
