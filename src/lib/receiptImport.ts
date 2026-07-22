export interface MatchedReceiptItem {
  itemId: string
  name: string
  emoji: string | null
  unit: string
  receiptText: string
  quantity: number
  price: number | null
  inventoryRows: { id: string; location: string; quantity: number }[]
}

export interface UnmatchedReceiptItem {
  name: string
  /** The original receipt text this was extracted from, e.g. "Friendly Farms Nonfat Plain Greek Yogurt" — shown as a subtitle since `name` is a generic (non-branded) suggestion. */
  receiptText: string
  canonicalName: string
  emoji: string
  unit: string
  category: string | null
  quantity: number
  price: number | null
}

export interface ReceiptImportDraft {
  store: string | null
  matched: MatchedReceiptItem[]
  unmatched: UnmatchedReceiptItem[]
}

const STORAGE_KEY = 'add-receipt-import-draft'

export async function fetchReceiptPhotoImport(file: File): Promise<{ data?: ReceiptImportDraft; error?: string }> {
  try {
    const formData = new FormData()
    formData.append('photo', file)
    const res = await fetch('/api/receipts/import-photo', { method: 'POST', body: formData })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error ?? "Couldn't read that receipt." }
    return {
      data: {
        store: body.store ?? null,
        matched: body.matched ?? [],
        unmatched: body.unmatched ?? [],
      },
    }
  } catch {
    return { error: "Couldn't read that receipt." }
  }
}

export function setReceiptImportDraft(draft: ReceiptImportDraft) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Storage full or unavailable — the review page will just show no items.
  }
}

// Reads and clears in one step — the draft is only meant to survive the
// single redirect from /add to /add/receipt, not linger afterward.
export function takeReceiptImportDraft(): ReceiptImportDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(STORAGE_KEY)
    return JSON.parse(raw)
  } catch {
    return null
  }
}
