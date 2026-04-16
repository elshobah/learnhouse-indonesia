'use client';

/**
 * Demo/Testing page for Payment Indonesia checkout
 * Use this to test the payment flow without integrating into course pages yet
 *
 * Navigate to /dev/payment-indonesia-demo (if dev routes enabled)
 */

import React, { useState } from 'react';
import { useOrg } from '@components/Contexts/OrgContext';
import { useLHSession } from '@components/Contexts/LHSessionContext';
import PaymentIndonesiaButton from './PaymentIndonesiaButton';
import { AlertCircle, CheckCircle } from 'lucide-react';

const PaymentIndonesiaDemo = () => {
  const org = useOrg() as any;
  const session = useLHSession() as any;

  const [testPrice, setTestPrice] = useState(100000);
  const [successMessage, setSuccessMessage] = useState('');

  if (!session?.data?.user) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
        <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
        <div>
          <h3 className="font-semibold text-amber-900">Not Authenticated</h3>
          <p className="text-sm text-amber-700">Please sign in first to test payment flow.</p>
        </div>
      </div>
    );
  }

  if (!org?.org_id && !org?.id) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
        <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
        <div>
          <h3 className="font-semibold text-amber-900">Missing Organization</h3>
          <p className="text-sm text-amber-700">No organization context found.</p>
        </div>
      </div>
    );
  }

  const orgId = org?.org_id || org?.id;

  const handleSuccess = () => {
    setSuccessMessage('✅ Payment verified successfully! Enrollment created.');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">Payment Indonesia - Test Flow</h1>
        <p className="text-sm text-blue-700">
          This is a demo page to test the Payment Indonesia checkout modal.
        </p>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Price (IDR)
              </label>
              <input
                type="number"
                value={testPrice}
                onChange={(e) => setTestPrice(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                System will add a 3-digit code automatically (100-999)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Org ID</p>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded border border-gray-200">
                  {orgId}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">User ID</p>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded border border-gray-200">
                  {session?.data?.user?.id?.toString().slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>
        </div>

        <hr className="my-4" />

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Test Checkout</h3>
          <p className="text-sm text-gray-600 mb-4">
            Click the button below to open Payment Indonesia checkout modal.
          </p>

          <PaymentIndonesiaButton
            courseId={`demo-course-${orgId}`}
            courseName="🧪 Test Course (Demo)"
            coursePrice={testPrice}
            onSuccess={handleSuccess}
            className="w-full md:w-auto"
          />
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 space-y-3">
        <h3 className="font-semibold text-gray-900">Testing Flow</h3>
        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
          <li>Click button above to open Payment Indonesia checkout</li>
          <li>Select payment method (Transfer or QRIS)</li>
          <li>
            Note the <strong>final amount</strong> (base price + 3-digit code)
          </li>
          <li>
            Click <strong>"Check Payment Status"</strong> to start polling
          </li>
          <li>
            Go to admin dashboard (Dashboard → Payments → Manual Payment tab)
            and verify the pending transaction
          </li>
          <li>Watch the checkout modal for real-time status update</li>
          <li>Success message should appear when verified</li>
        </ol>
      </div>

      <div className="bg-amber-50 rounded-lg border border-amber-200 p-6 space-y-3">
        <h3 className="font-semibold text-amber-900 flex gap-2 items-center">
          <AlertCircle size={18} /> Prerequisites
        </h3>
        <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
          <li>
            Admin must configure payment at least once (Bank OR QRIS) at
            Dashboard → Payments → Manual Payment → Edit
          </li>
          <li>
            Backend migration <code>z5a6b7c8d9e0_add_payment_indonesia</code> must be applied
          </li>
          <li>You must be signed in and part of an organization</li>
        </ul>
      </div>

      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 space-y-3">
        <h3 className="font-semibold text-blue-900">Integration to Production</h3>
        <p className="text-sm text-blue-700 mb-3">
          To integrate Payment Indonesia into course pages:
        </p>
        <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
          <li>
            Import <code>PaymentIndonesiaButton</code> in CourseActionsMobile.tsx
          </li>
          <li>
            Display it as alternative to Stripe offer when course has a price
          </li>
          <li>
            Handle <code>onSuccess</code> callback to refresh enrollment or redirect
          </li>
          <li>See INTEGRATION_GUIDE.md for detailed example code</li>
        </ol>
      </div>
    </div>
  );
};

export default PaymentIndonesiaDemo;
