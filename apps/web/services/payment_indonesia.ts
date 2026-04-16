/**
 * Payment Indonesia Service
 *
 * Frontend service for calling Payment Indonesia API endpoints
 */

import { getAPIUrl } from '@services/config/config'

interface FetchOptions {
  revalidate?: number
  tags?: string[]
  accessToken?: string | null
}

// ============================================================================
// Student Endpoints
// ============================================================================

/**
 * Create a new payment transaction
 */
export async function createPaymentTransaction(
  orgId: number | string,
  studentUserId: string,
  courseId: string,
  coursePrice: number,
  paymentMethod: 'transfer' | 'qris',
  accessToken: string | null,
  options: FetchOptions = {}
) {
  const params = new URLSearchParams({
    student_user_id: studentUserId,
    course_id: courseId,
    course_price: coursePrice.toString(),
    payment_method: paymentMethod,
  })

  const response = await fetch(
    `${getAPIUrl()}orgs/${orgId}/payment-id/create?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      },
      ...(options.revalidate && { next: { revalidate: options.revalidate } }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to create payment transaction')
  }

  return response.json()
}

/**
 * Get transaction status
 */
export async function getPaymentTransactionStatus(
  orgId: number | string,
  transactionId: string,
  accessToken: string | null,
  options: FetchOptions = {}
) {
  const response = await fetch(
    `${getAPIUrl()}orgs/${orgId}/payment-id/${transactionId}`,
    {
      headers: {
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      },
      ...(options.revalidate && { next: { revalidate: options.revalidate } }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get transaction status')
  }

  return response.json()
}

// ============================================================================
// Admin Endpoints
// ============================================================================

/**
 * List pending transactions for an organization
 */
export async function listPendingTransactions(
  orgId: number | string,
  limit: number = 50,
  offset: number = 0,
  accessToken: string | null,
  options: FetchOptions = {}
) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  })

  const response = await fetch(
    `${getAPIUrl()}orgs/${orgId}/payment-id/pending?${params.toString()}`,
    {
      headers: {
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      },
      ...(options.revalidate && { next: { revalidate: options.revalidate } }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to list transactions')
  }

  return response.json()
}

/**
 * Verify a payment transaction
 */
export async function verifyPaymentTransaction(
  orgId: number | string,
  transactionId: string,
  adminUserId: string,
  proofImageUrl?: string,
  accessToken: string | null = null
) {
  const params = new URLSearchParams({
    admin_user_id: adminUserId,
  })

  if (proofImageUrl) {
    params.append('proof_image_url', proofImageUrl)
  }

  const response = await fetch(
    `${getAPIUrl()}orgs/${orgId}/payment-id/${transactionId}/verify?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to verify transaction')
  }

  return response.json()
}

/**
 * Reject a payment transaction
 */
export async function rejectPaymentTransaction(
  orgId: number | string,
  transactionId: string,
  adminUserId: string,
  reason: string,
  accessToken: string | null = null
) {
  const params = new URLSearchParams({
    admin_user_id: adminUserId,
    reason: reason,
  })

  const response = await fetch(
    `${getAPIUrl()}orgs/${orgId}/payment-id/${transactionId}/reject?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to reject transaction')
  }

  return response.json()
}

// ============================================================================
// Configuration Endpoints
// ============================================================================

/**
 * Get payment configuration for an organization
 */
export async function getPaymentConfig(
  orgId: number | string,
  accessToken: string | null,
  options: FetchOptions = {}
) {
  const response = await fetch(`${getPaymentAPIUrl()}/api/v1/orgs/${orgId}/payment-id/config`, {
    headers: {
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
    },
    ...(options.revalidate && { next: { revalidate: options.revalidate } }),
  })

  if (!response.ok) {
    return null // Return null if config not found (404)
  }

  return response.json()
}

/**
 * Update payment configuration for an organization
 */
export async function updatePaymentConfig(
  orgId: number | string,
  configData: {
    bank_name?: string | null
    account_number?: string | null
    account_holder?: string | null
    qris_image_url?: string | null
    instruction_text?: string | null
    is_active?: boolean
  },
  accessToken: string | null = null
) {
  const response = await fetch(`${getPaymentAPIUrl()}/api/v1/orgs/${orgId}/payment-id/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
    },
    body: JSON.stringify(configData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to update payment configuration')
  }

  return response.json()
}
