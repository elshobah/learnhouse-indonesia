'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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

interface OrgPaymentConfigProps {
  orgId: number
  accessToken: string
  apiUrl: string
}

export default function OrgPaymentConfigComponent({
  orgId,
  accessToken,
  apiUrl,
}: OrgPaymentConfigProps) {
  const { t } = useTranslation('common')

  const [config, setConfig] = useState<OrgPaymentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [qrisImageUrl, setQrisImageUrl] = useState('')
  const [instructionText, setInstructionText] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Fetch config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/orgs/${orgId}/payment-id/config`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data) {
            setConfig(data)
            setBankName(data.bank_name || '')
            setAccountNumber(data.account_number || '')
            setAccountHolder(data.account_holder || '')
            setQrisImageUrl(data.qris_image_url || '')
            setInstructionText(data.instruction_text || '')
            setIsActive(data.is_active)
          }
        }
      } catch (error) {
        console.error('Failed to fetch payment config:', error)
        setMessage({ type: 'error', text: 'Failed to load payment configuration' })
      } finally {
        setLoading(false)
      }
    }

    if (accessToken) {
      fetchConfig()
    }
  }, [orgId, accessToken, apiUrl])

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)

      const response = await fetch(`${apiUrl}/api/v1/orgs/${orgId}/payment-id/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bank_name: bankName || null,
          account_number: accountNumber || null,
          account_holder: accountHolder || null,
          qris_image_url: qrisImageUrl || null,
          instruction_text: instructionText || null,
          is_active: isActive,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to save configuration')
      }

      const savedConfig = await response.json()
      setConfig(savedConfig)
      setMessage({ type: 'success', text: 'Payment configuration saved successfully' })

      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save configuration',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Configuration</h2>
        <p className="text-gray-600 mt-1">
          Atur metode pembayaran manual (transfer bank atau QRIS) untuk organisasi Anda
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSaveConfig} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Active Toggle */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-gray-900 font-medium">Enable Manual Payment</span>
          </label>
          <p className="text-sm text-gray-600 mt-1">
            Student akan dapat melakukan pembayaran jika opsi ini diaktifkan
          </p>
        </div>

        {/* Bank Details Section */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Bank Transfer Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., BCA, Mandiri, BNI"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g., 1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Account Holder */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="e.g., PT Elshobah Indonesia"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* QRIS Section */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">QRIS Payment</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QRIS Image URL
            </label>
            <input
              type="url"
              value={qrisImageUrl}
              onChange={(e) => setQrisImageUrl(e.target.value)}
              placeholder="https://example.com/qris.png"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-600 mt-1">
              URL gambar QRIS code yang akan ditampilkan kepada student
            </p>
            {qrisImageUrl && (
              <div className="mt-3">
                <img
                  src={qrisImageUrl}
                  alt="QRIS Preview"
                  className="w-40 h-40 border border-gray-300 rounded-lg object-contain"
                  onError={() =>
                    setMessage({ type: 'error', text: 'Failed to load QRIS image' })
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Custom Instructions</h3>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instruction Text (Markdown supported)
          </label>
          <textarea
            value={instructionText}
            onChange={(e) => setInstructionText(e.target.value)}
            placeholder="e.g., **Langkah 1:** Buka aplikasi banking Anda..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-sm text-gray-600 mt-1">
            Instruksi yang akan ditampilkan kepada student saat melakukan pembayaran
          </p>
        </div>

        {/* Submit Button */}
        <div className="border-t pt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Configuration
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">ℹ️ How It Works</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Student membuat transaksi pembayaran</li>
          <li>System menghasilkan kode unik 3 digit (e.g., nominal + kode 123)</li>
          <li>Student mentransfer ke rekening dengan jumlah yang tepat (termasuk kode)</li>
          <li>Admin verifikasi dan student mendapat akses ke kursus</li>
          <li>Transaksi otomatis expired setelah 24 jam jika tidak diverifikasi</li>
        </ul>
      </div>
    </div>
  )
}
