'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, Clock, Copy, QrCode, Loader2 } from 'lucide-react'

interface PaymentTransaction {
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
  expires_at: string
}

interface OrgPaymentConfig {
  id: number
  org_id: number
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  qris_image_url: string | null
  instruction_text: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function PaymentPage() {
  const params = useParams()
  const { data: session } = useSession()
  const { t } = useTranslation('common')

  const orgslug = params.orgslug as string
  const courseId = params.courseId as string

  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null)
  const [paymentConfig, setPaymentConfig] = useState<OrgPaymentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)
  const [copied, setCopied] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const accessToken = session?.tokens?.access_token

  // Fetch payment config on mount
  useEffect(() => {
    const fetchPaymentConfig = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/v1/orgs/${params.org_id}/payment-id/config`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        )
        if (response.ok) {
          const data = await response.json()
          setPaymentConfig(data)
        }
      } catch (err) {
        console.error('Failed to fetch payment config:', err)
      }
    }

    if (accessToken) {
      fetchPaymentConfig()
    }
  }, [accessToken, apiUrl, params.org_id])

  // Create transaction on mount
  useEffect(() => {
    const createTransaction = async () => {
      if (!accessToken || !paymentConfig) return

      try {
        setLoading(true)

        // Get course price (in real implementation, fetch from API)
        const coursePrice = 150000 // TODO: Get from course API
        const paymentMethod = paymentConfig.qris_image_url ? 'qris' : 'transfer'

        const response = await fetch(
          `${apiUrl}/api/v1/orgs/${params.org_id}/payment-id/create?` +
          `student_user_id=${session?.user?.id || 'unknown'}` +
          `&course_id=${courseId}` +
          `&course_price=${coursePrice}` +
          `&payment_method=${paymentMethod}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to create transaction')
        }

        const txData = await response.json()
        setTransaction(txData)

        // Start polling for verification
        setPolling(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create transaction')
        setLoading(false)
      }
    }

    if (paymentConfig && !transaction && accessToken) {
      createTransaction()
    }
  }, [paymentConfig, accessToken, courseId, params.org_id, apiUrl, session])

  // Poll transaction status
  useEffect(() => {
    if (!polling || !transaction || !accessToken) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/v1/orgs/${params.org_id}/payment-id/${transaction.transaction_id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        )

        if (response.ok) {
          const updatedTx = await response.json()
          setTransaction(updatedTx)

          // Stop polling if verified or expired
          if (['verified', 'expired', 'rejected'].includes(updatedTx.status)) {
            setPolling(false)
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(pollInterval)
  }, [polling, transaction, accessToken, params.org_id, apiUrl])

  const handleCopyAmount = () => {
    if (transaction) {
      navigator.clipboard.writeText(transaction.final_amount.toString())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error || !transaction || !paymentConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
          <h2 className="font-semibold text-red-900">Error</h2>
          <p className="text-sm text-red-700 mt-1">{error || 'Payment configuration not found'}</p>
        </div>
      </div>
    )
  }

  const timeRemaining = new Date(transaction.expires_at).getTime() - Date.now()
  const minutesLeft = Math.floor(timeRemaining / 60000)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('payments') || 'Pembayaran'}
          </h1>
          <p className="text-gray-600">
            Selesaikan pembayaran untuk mengakses kursus
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Transaction ID</div>
            <div className="font-mono text-sm font-semibold text-gray-900 break-all">
              {transaction.transaction_id.substring(0, 12)}...
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Status</div>
            <div className="flex items-center gap-2 mt-1">
              {transaction.status === 'pending' && (
                <>
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="font-semibold text-yellow-600">Pending</span>
                </>
              )}
              {transaction.status === 'verified' && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-600">Verified</span>
                </>
              )}
              {transaction.status === 'expired' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-red-600">Expired</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Time Remaining</div>
            <div className="font-semibold text-gray-900 mt-1">
              {minutesLeft > 0 ? `${minutesLeft} minutes` : 'Expired'}
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        {transaction.status === 'pending' && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {transaction.payment_method === 'transfer' ? 'Transfer Bank' : 'QRIS Payment'}
            </h2>

            {transaction.payment_method === 'transfer' && paymentConfig.bank_name && (
              <div className="space-y-6">
                {/* Bank Details */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Detail Rekening</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">Bank</label>
                      <p className="font-semibold text-gray-900">{paymentConfig.bank_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Nomor Rekening</label>
                      <p className="font-mono font-semibold text-gray-900">{paymentConfig.account_number}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Atas Nama</label>
                      <p className="font-semibold text-gray-900">{paymentConfig.account_holder}</p>
                    </div>
                  </div>
                </div>

                {/* Amount to Transfer */}
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Jumlah Transfer</h3>
                  <div className="flex items-baseline gap-4">
                    <div className="text-4xl font-bold text-green-600">
                      Rp {transaction.final_amount.toLocaleString('id-ID')}
                    </div>
                    <button
                      onClick={handleCopyAmount}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <strong>Penting:</strong> Jumlah transfer harus tepat (termasuk kode unik <strong>{transaction.unique_code}</strong>) agar dapat diverifikasi otomatis.
                  </div>
                </div>

                {/* Instructions */}
                {paymentConfig.instruction_text && (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Instruksi</h3>
                    <div
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: paymentConfig.instruction_text }}
                    />
                  </div>
                )}
              </div>
            )}

            {transaction.payment_method === 'qris' && paymentConfig.qris_image_url && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="bg-white p-6 border border-gray-200 rounded-lg">
                    <img
                      src={paymentConfig.qris_image_url}
                      alt="QRIS Code"
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Jumlah Transfer</h3>
                  <div className="text-3xl font-bold text-blue-600">
                    Rp {transaction.final_amount.toLocaleString('id-ID')}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Scan QRIS di atas dan masukkan jumlah yang tertera
                  </p>
                </div>
              </div>
            )}

            {/* Polling Status */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded text-center text-sm text-blue-800">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Sistem sedang memantau pembayaran Anda... Halaman akan otomatis diperbarui dalam {Math.ceil(timeRemaining / 1000)}s
            </div>
          </div>
        )}

        {/* Verified State */}
        {transaction.status === 'verified' && (
          <div className="bg-green-50 rounded-lg shadow-lg p-8 border border-green-200">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">Pembayaran Terverifikasi!</h2>
              <p className="text-green-700 mb-6">
                Transaksi Anda telah diverifikasi oleh admin. Anda sekarang dapat mengakses kursus.
              </p>
              <a
                href={`/${orgslug}/courses`}
                className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Kembali ke Kursus
              </a>
            </div>
          </div>
        )}

        {/* Expired State */}
        {transaction.status === 'expired' && (
          <div className="bg-red-50 rounded-lg shadow-lg p-8 border border-red-200">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Pembayaran Kadaluarsa</h2>
              <p className="text-red-700 mb-6">
                Waktu pembayaran telah habis. Silakan buat transaksi baru.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Buat Transaksi Baru
              </button>
            </div>
          </div>
        )}

        {/* Rejected State */}
        {transaction.status === 'rejected' && (
          <div className="bg-orange-50 rounded-lg shadow-lg p-8 border border-orange-200">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-orange-900 mb-2">Pembayaran Ditolak</h2>
              {transaction.rejection_reason && (
                <p className="text-orange-700 mb-6">
                  <strong>Alasan:</strong> {transaction.rejection_reason}
                </p>
              )}
              <p className="text-orange-700 mb-6">
                Silakan hubungi admin untuk informasi lebih lanjut.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Buat Transaksi Baru
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
