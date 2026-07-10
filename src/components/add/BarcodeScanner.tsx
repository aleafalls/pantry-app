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

    // html5-qrcode measures the container and applies inline pixel
    // dimensions to the <video> it injects (and re-applies them once the
    // camera stream's native resolution is known on 'loadedmetadata') — our
    // stylesheet rule below can lose that cascade race. A MutationObserver
    // catches the video the instant it's inserted and force-fills it via an
    // inline !important, which always wins regardless of what the library
    // sets afterward.
    const container = document.getElementById(SCANNER_ELEMENT_ID)
    let videoObserver: MutationObserver | null = null

    function forceFill(video: HTMLVideoElement) {
      video.style.setProperty('width', '100%', 'important')
      video.style.setProperty('height', '100%', 'important')
      video.style.setProperty('object-fit', 'cover', 'important')
    }

    if (container) {
      videoObserver = new MutationObserver(() => {
        const video = container.querySelector('video')
        if (video) forceFill(video)
      })
      videoObserver.observe(container, { childList: true, subtree: true })
    }

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
      if (cancelled) return
      setPermissionDenied(false)
      const video = container?.querySelector('video')
      if (video) forceFill(video)
    }).catch(() => {
      if (!cancelled) setPermissionDenied(true)
    })

    return () => {
      cancelled = true
      videoObserver?.disconnect()
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
    <div style={{ position: 'fixed', inset: 0, width: '100dvw', height: '100dvh', zIndex: 100, background: '#000', overflow: 'hidden' }}>
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
        <>
          <div id={SCANNER_ELEMENT_ID} style={{ position: 'absolute', inset: 0 }} />

          {/* Focus frame — purely a visual target for the user. Detection still
              runs full-frame (see scanner.start below), which is far more
              forgiving than constraining it to this box. */}
          <div
            style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '82%', maxWidth: 340, height: 140,
              borderRadius: 20, border: '3px solid rgba(255,255,255,0.9)',
              boxShadow: '0 0 0 2000px rgba(0, 0, 0, 0.55)',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

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
          position: 'absolute', top: 'max(76px, calc(env(safe-area-inset-top) + 60px))', left: 24, right: 24,
          textAlign: 'center', zIndex: 9, pointerEvents: 'none',
        }}
      >
        <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>
          Scan barcode
        </p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0, lineHeight: 1.4 }}>
          Line up the barcode inside the frame to scan it automatically.
        </p>
      </div>
    </div>
  )
}
