export interface InquiryRequest {
  vaAcctNo: string
  serviceId?: string
  masterAccount?: string
  additionalInformation?: { key: string; value: string }[]
}

export interface InquiryResponse {
  vaAcctNo?: string
  accountName?: string
  noOfVariableLayer?: number
  variableLayer1?: string | null
  variableLayer2?: string | null
  variableLayer3?: string | null
  variableLayer4?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
  serviceId?: string
  additionalInformation?: { key: string; value: string }[]
  errorCode?: string
  errorMessage?: string
  amount?: number
}

export interface PaymentRequest {
  vaAcctNo: string
  amount: number
  senderAcct?: string
  senderName?: string
  narrative?: string
  channel?: string
  currency?: string
  vaName?: string
  masterAccount?: string
  inquiryFirst?: boolean
}

export interface PaymentResponse {
  result?: string
  errorCode?: string
  status?: string
  [key: string]: unknown
}

export interface Transaction {
  id: number
  msgId: string
  itemId: string
  endToEndId: string
  vaAcctNo: string
  vaName?: string
  masterAcct?: string
  serviceId?: string
  amount: number
  currency?: string
  senderAcct?: string
  senderName?: string
  narrative?: string
  channel?: string
  status: 'NOTIFIED' | 'FAILED' | 'REFUNDED'
  partnerErrorCode?: string
  createdAt: string
}

export interface Refund {
  id: number
  txId: string
  messageId?: string
  amount: number
  fromAcct?: string
  toAcct?: string
  toAcctName?: string
  description?: string
  orgAccountingRef?: string
  channel?: string
  status: 'ACCEPTED' | 'COMPLETED' | 'REJECTED'
  remark?: 'AUTH' | 'NAUT'
  txnBnkId?: string
  createdAt: string
}

export interface LogEntry {
  id: string
  timestamp: string
  endpoint: string
  request: unknown
  response: unknown
  status: number | 'error'
  durationMs: number
}
