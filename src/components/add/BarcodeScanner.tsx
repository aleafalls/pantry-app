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

    // No qrbox — scan the full frame. A cropped scan region is finicky for
    // 1D barcodes since it requires the user to align the code precisely
    // inside a small box; full-frame is far more forgiving.
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10 },
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000' }}>
      {/* html5-qrcode injects its own <video> into this div, sized to its
          natural camera aspect ratio — force it to fill the container so it
          can never push the close button off-screen. */}
      <style>{`
        #${SCANNER_ELEMENT_ID} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>

      {/* Close button — fixed on top, always reachable regardless of video size */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close scanner"
        style={{
          position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', left: 16, zIndex: 10,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.5)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className="fi-rr-cross-small" style={{ fontSize: 20, display: 'block', color: '#fff' }} />
      </button>

      <div
        style={{
          position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', left: 0, right: 0,
          textAlign: 'center', zIndex: 9, pointerEvents: 'none',
        }}
      >
        <span style={{
          color: '#fff', fontSize: 14, fontWeight: 700,
          background: 'rgba(0, 0, 0, 0.45)', padding: '8px 16px', borderRadius: 99,
        }}>
          Scan a barcode
        </span>
      </div>

      {permissionDenied ? (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 32, textAlign: 'center',
        }}>
          <i className="fi-rr-camera-viewfinder" style={{ fontSize: 32, display: 'block', marginBottom: 10, color: '#fff' }} />
          <p style={{ color: '#fff', fontSize: 14 }}>
            Camera access needed for scanning. You can still add items by typing.
          </p>
        </div>
      ) : (
        <div id={SCANNER_ELEMENT_ID} style={{ position: 'absolute', inset: 0 }} />
      )}
    </div>
  )
}
