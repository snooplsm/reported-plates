import type { ComplaintType } from "./Complaints"
import type { PlateDetection } from "./api/segment"
import type { GeoSearchResponse } from "./api/ny/nyc/nyc"

const DB_NAME = "reported-draft"
const STORE_NAME = "drafts"
const DRAFT_KEY = "current-report"

export type ReportDraft = {
  files: File[]
  complaintType?: ComplaintType
  location?: GeoSearchResponse
  latLng?: number[]
  dateOfIncident?: string
  plate?: Pick<PlateDetection, "text" | "state" | "plateOverride" | "tlc">
  reportDescription: string
}

const openDraftDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1)
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME)
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

const runRequest = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDraftDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode)
      const request = action(transaction.objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export const loadReportDraft = () => runRequest<ReportDraft | undefined>("readonly", store => store.get(DRAFT_KEY))
export const saveReportDraft = (draft: ReportDraft) => runRequest<IDBValidKey>("readwrite", store => store.put(draft, DRAFT_KEY))
export const clearReportDraft = () => runRequest<undefined>("readwrite", store => store.delete(DRAFT_KEY))
