'use client';

import React, { useState, useEffect } from 'react';
import { useOrg } from '@components/Contexts/OrgContext';
import { useLHSession } from '@components/Contexts/LHSessionContext';
import { getPaymentConfig } from '@services/payment_indonesia';
import { Banknote } from 'lucide-react';
import { Button } from '@components/ui/button';
import PaymentIndonesiaCheckout from './PaymentIndonesiaCheckout';

interface PaymentIndonesiaButtonProps {
  courseId: string;
  courseName: string;
  coursePrice: number;
  onSuccess?: () => void;
  className?: string;
}

/**
 * Button to open Payment Indonesia checkout modal
 * Only shows if payment is configured for the organization
 */
const PaymentIndonesiaButton: React.FC<PaymentIndonesiaButtonProps> = ({
  courseId,
  courseName,
  coursePrice,
  onSuccess,
  className = '',
}) => {
  const org = useOrg() as any;
  const session = useLHSession() as any;
  const token = session?.data?.tokens?.access_token;
  const orgId = org?.org_id || org?.id;

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPaymentConfigured, setIsPaymentConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if payment configuration exists
  useEffect(() => {
    if (!orgId || !token) return;

    const checkConfig = async () => {
      try {
        const config = await getPaymentConfig(orgId, token);
        setIsPaymentConfigured(!!config?.bank_name || !!config?.qris_image_url);
      } catch (err) {
        console.error('Failed to load payment config:', err);
        setIsPaymentConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConfig();
  }, [orgId, token]);

  if (isLoading) {
    return (
      <Button
        disabled
        className={`gap-2 ${className}`}
      >
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        Loading...
      </Button>
    );
  }

  if (!isPaymentConfigured) {
    return null; // Don't show button if payment not configured
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <>
      <Button
        onClick={() => setIsCheckoutOpen(true)}
        className={`bg-blue-600 hover:bg-blue-700 text-white gap-2 ${className}`}
      >
        <Banknote size={16} />
        Pay Transfer/QRIS — {formatPrice(coursePrice)}
      </Button>

      <PaymentIndonesiaCheckout
        courseId={courseId}
        courseName={courseName}
        coursePrice={coursePrice}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => {
          setIsCheckoutOpen(false);
          onSuccess?.();
        }}
      />
    </>
  );
};

export default PaymentIndonesiaButton;
