'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@components/Contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  Copy
} from 'lucide-react'

interface ManualTransaction {
  id: number
  transaction_id: string
  student_user_id: string
  course_id: string
  org_id: number
  amount: number
  unique_code: number
  final_amount: number
  status: 'pending' | 'verified' | 'expired' | 'rejected'
  payment_method: 'transfer' | 'qris'
  verified_by: string | null
  verified_at: string | null
  proof_image_url: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  expires_at: string
}

interface PendingTransactionsResponse {
  transactions: ManualTransaction[]
  total: number
  limit: number
  offset: number
}

export default function PaymentAdminDashboard() {
  const params = useParams()
  const { session } = useAuth()
  const { t } = useTranslation('common')

  const orgslug = params.orgslug as string
  const orgId = params.org_id as string

  const [transactions, setTransactions] = useState<ManualTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<string>('')
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 })

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const accessToken = session?.tokens?.access_token

  // Fetch pending transactions
  const fetchTransactions = async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      const response = await fetch(
        `${apiUrl}/api/v1/orgs/${orgId}/payment-id/pending?limit=${pagination.limit}&offset=${pagination.offset}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data: PendingTransactionsResponse = await response.json()
      setTransactions(data.transactions)
      setPagination({
        limit: data.limit,
        offset: data.offset,
        total: data.total,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchTransactions()
    }
  }, [accessToken, pagination.offset])

  const handleVerifyTransaction = async (transactionId: string) => {
    if (!accessToken) return

    try {
      setVerifyingId(transactionId)

      const response = await fetch(
        `${apiUrl}/api/v1/orgs/${orgId}/payment-id/${transactionId}/verify?admin_user_id=${session?.user?.id || 'admin'}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to verify transaction')
      }

      // Refresh transactions
      await fetchTransactions()
      setExpandedId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to verify transaction')
    } finally {
      setVerifyingId(null)
    }
  }

  const handleRejectTransaction = async (transactionId: string) => {
    if (!accessToken || !rejectReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    try {
      setRejectingId(transactionId)

      const response = await fetch(
        `${apiUrl}/api/v1/orgs/${orgId}/payment-id/${transactionId}/reject?` +
        `admin_user_id=${session?.user?.id || 'admin'}` +
        `&reason=${encodeURIComponent(rejectReason)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to reject transaction')
      }

      // Refresh transactions
      await fetchTransactions()
      setExpandedId(null)
      setRejectReason('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject transaction')
    } finally {
      setRejectingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID')
  }

  const timeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now()
    if (remaining <= 0) return 'Expired'
    const minutes = Math.floor(remaining / 60000)
    return `${minutes} minutes`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('payments') || 'Payment Management'}
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola dan verifikasi transaksi pembayaran manual
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Pending</div>
            <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">This Month</div>
            <div className="text-2xl font-bold text-gray-900">-</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Verified</div>
            <div className="text-2xl font-bold text-green-600">-</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Rejected</div>
            <div className="text-2xl font-bold text-red-600">-</div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Transactions List */}
        {!loading && transactions.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Tidak ada transaksi pending</p>
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.transaction_id} className="bg-white rounded-lg shadow">
                {/* Row Header */}
                <div
                  onClick={() =>
                    setExpandedId(expandedId === tx.transaction_id ? null : tx.transaction_id)
                  }
                  className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Status Icon */}
                    {tx.status === 'pending' && (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    )}
                    {tx.status === 'verified' && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {tx.status === 'rejected' && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}

                    {/* Transaction Info */}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {tx.student_user_id} - Rp {tx.final_amount.toLocaleString('id-ID')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {tx.transaction_id.substring(0, 12)}... • {formatDate(tx.created_at)}
                      </div>
                    </div>

                    {/* Time remaining */}
                    {tx.status === 'pending' && (
                      <div className="text-sm text-gray-600">
                        {timeRemaining(tx.expires_at)}
                      </div>
                    )}
                  </div>

                  {/* Expand Icon */}
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedId === tx.transaction_id ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* Expanded Details */}
                {expandedId === tx.transaction_id && (
                  <div className="border-t p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-600">Transaction ID</label>
                          <div className="font-mono text-sm font-semibold text-gray-900 break-all flex items-center gap-2">
                            {tx.transaction_id}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(tx.transaction_id)
                              }}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Student User ID</label>
                          <p className="font-semibold text-gray-900">{tx.student_user_id}</p>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Course ID</label>
                          <p className="font-semibold text-gray-900">{tx.course_id}</p>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Payment Method</label>
                          <p className="font-semibold text-gray-900 capitalize">{tx.payment_method}</p>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-600">Amount (Course Price)</label>
                          <p className="font-semibold text-gray-900">
                            Rp {tx.amount.toLocaleString('id-ID')}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Unique Code</label>
                          <p className="font-mono font-semibold text-gray-900 text-lg">{tx.unique_code}</p>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Final Amount to Transfer</label>
                          <p className="font-semibold text-green-600 text-lg">
                            Rp {tx.final_amount.toLocaleString('id-ID')}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Created At</label>
                          <p className="text-gray-900">{formatDate(tx.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Proof Image */}
                    {tx.proof_image_url && (
                      <div className="mb-6">
                        <label className="text-sm text-gray-600 block mb-2">Proof Image</label>
                        <img
                          src={tx.proof_image_url}
                          alt="Proof"
                          className="max-w-sm rounded border border-gray-200"
                        />
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {tx.rejection_reason && (
                      <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded">
                        <label className="text-sm text-red-600 font-semibold">Rejection Reason</label>
                        <p className="text-red-700 mt-1">{tx.rejection_reason}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {tx.status === 'pending' && (
                      <div className="space-y-3">
                        {/* Verify Button */}
                        <button
                          onClick={() => handleVerifyTransaction(tx.transaction_id)}
                          disabled={verifyingId === tx.transaction_id}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                          {verifyingId === tx.transaction_id && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          Verify Payment
                        </button>

                        {/* Reject Section */}
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rejection reason (e.g., amount mismatch)"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          />
                          <button
                            onClick={() => handleRejectTransaction(tx.transaction_id)}
                            disabled={rejectingId === tx.transaction_id || !rejectReason.trim()}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                          >
                            {rejectingId === tx.transaction_id && (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            Reject Payment
                          </button>
                        </div>
                      </div>
                    )}

                    {tx.status !== 'pending' && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                        This transaction has already been processed.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.total > pagination.limit && (
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() =>
                setPagination({ ...pagination, offset: Math.max(0, pagination.offset - pagination.limit) })
              }
              disabled={pagination.offset === 0}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
            >
              Previous
            </button>
            <div className="flex items-center gap-2 text-gray-600">
              <span>
                {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
                {pagination.total}
              </span>
            </div>
            <button
              onClick={() =>
                setPagination({ ...pagination, offset: pagination.offset + pagination.limit })
              }
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
