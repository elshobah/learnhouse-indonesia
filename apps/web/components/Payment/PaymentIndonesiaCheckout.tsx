'use client';

import React, { useState, useEffect } from 'react';
import { useOrg } from '@components/Contexts/OrgContext';
import { useLHSession } from '@components/Contexts/LHSessionContext';
import {
  createPaymentTransaction,
  getPaymentConfig,
  getPaymentTransactionStatus,
} from '@services/payment_indonesia';
import {
  X, Copy, Check, Clock, AlertCircle, QrCode, Banknote, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@components/ui/button';
import Modal from '@components/Objects/StyledElements/Modal/Modal';

interface PaymentIndonesiaCheckoutProps {
  courseId: string;
  courseName: string;
  coursePrice: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type PaymentMethod = 'transfer' | 'qris';
type CheckoutStep = 'select_method' | 'loading' | 'payment_details' | 'status_checking';

const PaymentIndonesiaCheckout: React.FC<PaymentIndonesiaCheckoutProps> = ({
  courseId,
  courseName,
  coursePrice,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const org = useOrg() as any;
  const session = useLHSession() as any;
  const token = session?.data?.tokens?.access_token;
  const userId = session?.data?.user?.id?.toString();
  const orgId = org?.org_id || org?.id;

  const [step, setStep] = useState<CheckoutStep>('select_method');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // Load payment config on mount
  useEffect(() => {
    if (!isOpen || !orgId || !token) return;

    const loadConfig = async () => {
      try {
        const cfg = await getPaymentConfig(orgId, token);
        setConfig(cfg);
      } catch (err) {
        console.error('Failed to load payment config:', err);
      }
    };

    loadConfig();
  }, [isOpen, orgId, token]);

  const handleSelectMethod = async (method: PaymentMethod) => {
    if (!orgId || !userId || !token) {
      toast.error('Missing required information');
      return;
    }

    setPaymentMethod(method);
    setStep('loading');

    try {
      const result = await createPaymentTransaction(
        orgId,
        userId,
        courseId,
        coursePrice,
        method,
        token
      );

      setTransactionId(result.transaction_id);
      setTransaction(result);
      setStep('payment_details');
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to create payment transaction');
      setStep('select_method');
    }
  };

  const handleCopyAmount = () => {
    if (transaction?.final_amount) {
      navigator.clipboard.writeText(transaction.final_amount.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckStatus = async () => {
    if (!transactionId || !orgId || !token) return;

    setStep('status_checking');
    setIsPolling(true);
    setPollCount(0);

    const maxAttempts = 30; // Max 30 checks = 5 minutes with 10s interval
    let attempts = 0;

    const pollStatus = async () => {
      try {
        const updatedTransaction = await getPaymentTransactionStatus(
          orgId,
          transactionId,
          token
        );

        setPollCount(attempts);

        if (updatedTransaction.status === 'verified') {
          setTransaction(updatedTransaction);
          setIsPolling(false);
          toast.success('Payment verified! You now have access to the course.');

          // Call success callback after a short delay
          setTimeout(() => {
            onClose();
            onSuccess?.();
          }, 1500);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, 10000); // Check every 10 seconds
        } else {
          setIsPolling(false);
          toast.error('Payment verification timed out. Please try again later.');
          setStep('payment_details');
        }
      } catch (err) {
        console.error('Failed to check status:', err);
        setIsPolling(false);
        setStep('payment_details');
      }
    };

    pollStatus();
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleClose = () => {
    if (isPolling) {
      toast.error('Please wait for status check to complete');
      return;
    }
    setStep('select_method');
    setTransactionId(null);
    setTransaction(null);
    setCopied(false);
    setPollCount(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isDialogOpen={isOpen}
      onOpenChange={handleClose}
      dialogTitle="Payment - Manual Transfer / QRIS"
      dialogDescription={`Complete your payment for ${courseName}`}
      dialogContent={
        <div className="space-y-6 px-2 py-4">
          {/* Step 1: Select Payment Method */}
          {step === 'select_method' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Course Price: <span className="font-semibold text-gray-900">{formatAmount(coursePrice)}</span>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Bank Transfer Option */}
                <button
                  onClick={() => handleSelectMethod('transfer')}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <Banknote className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <h3 className="font-semibold text-gray-900">Bank Transfer</h3>
                      <p className="text-xs text-gray-500 mt-1">Transfer to bank account</p>
                    </div>
                  </div>
                </button>

                {/* QRIS Option */}
                <button
                  onClick={() => handleSelectMethod('qris')}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <QrCode className="text-purple-600 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <h3 className="font-semibold text-gray-900">QRIS</h3>
                      <p className="text-xs text-gray-500 mt-1">Scan QR code with app</p>
                    </div>
                  </div>
                </button>
              </div>

              {(!config?.bank_name && !config?.qris_image_url) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Payment configuration not available. Please contact support.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Loading */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-sm text-gray-600">Generating payment details...</p>
            </div>
          )}

          {/* Step 3: Payment Details */}
          {step === 'payment_details' && transaction && (
            <div className="space-y-4">
              {/* Amount to Transfer */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">
                  Amount to Transfer
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-gray-900">
                    {formatAmount(transaction.final_amount)}
                  </p>
                  <button
                    onClick={handleCopyAmount}
                    className="px-3 py-2 bg-white rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
                  >
                    {copied ? (
                      <>
                        <Check size={16} className="text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  This includes base price + {String(transaction.unique_code).padStart(3, '0')} verification code
                </p>
              </div>

              {/* Bank Transfer Details */}
              {paymentMethod === 'transfer' && config?.bank_name && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Bank Account Details</p>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Bank</p>
                      <p className="text-sm text-gray-900 font-semibold">{config.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Account Number</p>
                      <p className="text-sm text-gray-900 font-mono font-semibold">{config.account_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Account Holder</p>
                      <p className="text-sm text-gray-900 font-semibold">{config.account_holder}</p>
                    </div>
                  </div>

                  {config.instruction_text && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 font-medium mb-2">Instructions</p>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border border-gray-100">
                        {config.instruction_text}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* QRIS Details */}
              {paymentMethod === 'qris' && config?.qris_image_url && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 flex flex-col items-center">
                  <p className="text-sm font-semibold text-gray-900">Scan QR Code</p>
                  <img
                    src={config.qris_image_url}
                    alt="QRIS Code"
                    className="w-48 h-48 border border-gray-200 rounded-lg"
                  />
                  {config.instruction_text && (
                    <div className="w-full mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 font-medium mb-2">Instructions</p>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border border-gray-100">
                        {config.instruction_text}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <Clock size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold">Payment expires in 24 hours</p>
                  <p className="text-xs mt-1">
                    After transferring, click "Check Payment Status" below to verify.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleCheckStatus}
                  disabled={isPolling}
                >
                  {isPolling ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Checking... ({pollCount}s)
                    </>
                  ) : (
                    <>
                      <Clock size={16} className="mr-2" />
                      Check Payment Status
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Status Checking */}
          {step === 'status_checking' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="relative w-12 h-12">
                <Loader2 className="animate-spin text-blue-600 absolute inset-0" size={48} />
              </div>
              <p className="text-sm text-gray-600">Checking payment status...</p>
              <p className="text-xs text-gray-500">Checking for {pollCount} seconds</p>
            </div>
          )}
        </div>
      }
    />
  );
};

export default PaymentIndonesiaCheckout;
