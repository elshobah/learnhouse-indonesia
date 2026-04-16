'use client';
import React, { useState } from 'react';
import { useOrg } from '@components/Contexts/OrgContext';
import { useLHSession } from '@components/Contexts/LHSessionContext';
import useSWR, { mutate } from 'swr';
import {
  getPaymentConfig,
  updatePaymentConfig,
  listPendingTransactions,
  verifyPaymentTransaction,
  rejectPaymentTransaction,
} from '@services/payment_indonesia';
import {
  Save, Check, X, Calendar, DollarSign, Landmark, AlertCircle,
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Label } from '@components/ui/label';
import Modal from '@components/Objects/StyledElements/Modal/Modal';
import ConfirmationModal from '@components/Objects/StyledElements/ConfirmationModal/ConfirmationModal';
import toast from 'react-hot-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@components/ui/table';

// ---------------------------------------------------------------------------
// Payment Config Form Section
// ---------------------------------------------------------------------------

function PaymentConfigSection() {
  const org = useOrg() as any;
  const session = useLHSession() as any;
  const token = session?.data?.tokens?.access_token;
  const orgId = org?.org_id || org?.id;

  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_holder: '',
    qris_image_url: '',
    instruction_text: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const swrKey = orgId && token ? [`/payment-config/${orgId}`, token] : null;
  const { data: config, error, isLoading } = useSWR(
    swrKey,
    ([, t]: any) => getPaymentConfig(orgId, t),
    { revalidateOnFocus: false }
  );

  React.useEffect(() => {
    if (config) {
      setFormData({
        bank_name: config.bank_name || '',
        account_number: config.account_number || '',
        account_holder: config.account_holder || '',
        qris_image_url: config.qris_image_url || '',
        instruction_text: config.instruction_text || '',
        is_active: config.is_active ?? true,
      });
    }
  }, [config]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bank_name?.trim() && !formData.qris_image_url?.trim()) {
      toast.error('Setup at least Bank or QRIS payment method');
      return;
    }

    setLoading(true);
    try {
      await updatePaymentConfig(orgId, formData, token);
      toast.success('Payment config updated');
      mutate(swrKey);
      setIsEditing(false);
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to save config');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) return <div className="p-8 text-sm text-gray-400">Loading config…</div>;
  if (error) return <div className="p-8 text-sm text-red-500">Failed to load config.</div>;

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between bg-gray-50 px-5 py-3 rounded-md">
        <div className="-space-y-0.5">
          <h2 className="font-bold text-lg text-gray-800">Payment Configuration</h2>
          <p className="text-gray-500 text-sm">Setup your bank account and QRIS details</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            Edit
          </Button>
        )}
      </div>

      {!isEditing ? (
        // Display mode
        <div className="bg-gray-50 rounded-lg p-5 space-y-4">
          {formData.bank_name && (
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bank Name</p>
                <p className="text-sm font-medium text-gray-800">{formData.bank_name}</p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Account Number</p>
                <p className="text-sm font-medium text-gray-800">{formData.account_number}</p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Account Holder</p>
                <p className="text-sm font-medium text-gray-800">{formData.account_holder}</p>
              </div>
            </div>
          )}

          {formData.qris_image_url && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">QRIS Image</p>
              <img src={formData.qris_image_url} alt="QRIS" className="w-40 h-40 rounded-lg border border-gray-200" />
            </div>
          )}

          {formData.instruction_text && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Instructions</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{formData.instruction_text}</p>
            </div>
          )}

          {!formData.bank_name && !formData.qris_image_url && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">No payment method configured yet. Click Edit to add one.</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
            {formData.is_active ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                <Check size={12} /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                <X size={12} /> Inactive
              </span>
            )}
          </div>
        </div>
      ) : (
        // Edit mode
        <form onSubmit={handleSave} className="bg-gray-50 rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank">Bank Name</Label>
              <Input
                id="bank"
                value={formData.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                placeholder="e.g. BCA, Mandiri, BNI"
              />
            </div>
            <div>
              <Label htmlFor="account">Account Number</Label>
              <Input
                id="account"
                value={formData.account_number}
                onChange={(e) => handleChange('account_number', e.target.value)}
                placeholder="e.g. 1234567890"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="holder">Account Holder</Label>
            <Input
              id="holder"
              value={formData.account_holder}
              onChange={(e) => handleChange('account_holder', e.target.value)}
              placeholder="e.g. PT Company Name"
            />
          </div>

          <div>
            <Label htmlFor="qris">QRIS Image URL</Label>
            <Input
              id="qris"
              type="url"
              value={formData.qris_image_url}
              onChange={(e) => handleChange('qris_image_url', e.target.value)}
              placeholder="https://example.com/qris.png"
            />
          </div>

          <div>
            <Label htmlFor="instructions">Instructions (Markdown)</Label>
            <Textarea
              id="instructions"
              value={formData.instruction_text}
              onChange={(e) => handleChange('instruction_text', e.target.value)}
              placeholder="Step 1: Open your bank app&#10;Step 2: Transfer to the account..."
              rows={4}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="active" className="!mt-0">Active</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save size={14} className="mr-1.5" />
              {loading ? 'Saving…' : 'Save Config'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transactions List Section
// ---------------------------------------------------------------------------

function TransactionsSection() {
  const org = useOrg() as any;
  const session = useLHSession() as any;
  const token = session?.data?.tokens?.access_token;
  const orgId = org?.org_id || org?.id;
  const userId = session?.data?.user?.user_uuid;

  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const swrKey = orgId && token ? [`/payment-transactions/${orgId}`, token, limit, offset] : null;
  const { data: transactionsData, error, isLoading, mutate: mutateTx } = useSWR(
    swrKey,
    ([, t]: any) => listPendingTransactions(orgId, limit, offset, t),
    { revalidateOnFocus: false }
  );

  const transactions = Array.isArray(transactionsData?.transactions) ? transactionsData.transactions : [];
  const total = transactionsData?.total || 0;

  const handleVerify = async (transactionId: string) => {
    try {
      await verifyPaymentTransaction(orgId, transactionId, userId, undefined, token);
      toast.success('Transaction verified');
      mutateTx();
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to verify transaction');
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await rejectPaymentTransaction(orgId, rejectingId, userId, rejectReason.trim(), token);
      toast.success('Transaction rejected');
      mutateTx();
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to reject transaction');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  if (isLoading) return <div className="p-8 text-sm text-gray-400">Loading transactions…</div>;
  if (error) return <div className="p-8 text-sm text-red-500">Failed to load transactions.</div>;

  return (
    <div className="space-y-4">
      <Modal
        isDialogOpen={!!rejectingId}
        onOpenChange={(open) => { if (!open) setRejectingId(null); }}
        dialogTitle="Reject Payment Transaction"
        dialogDescription="Enter the reason why this transaction is being rejected"
        dialogContent={
          <div className="space-y-4 px-1.5 py-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Amount does not match, please retry..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectingId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Reject Transaction
              </Button>
            </div>
          </div>
        }
      />

      <div className="flex items-center justify-between bg-gray-50 px-5 py-3 rounded-md">
        <div className="-space-y-0.5">
          <h2 className="font-bold text-lg text-gray-800">Pending Transactions</h2>
          <p className="text-gray-500 text-sm">Verify or reject student payments</p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <DollarSign size={22} className="text-indigo-300" />
          </div>
          <p className="font-semibold text-gray-600 mb-1">No pending transactions</p>
          <p className="text-sm text-gray-400">All payments have been verified or expired.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold text-gray-600">Transaction</TableHead>
                <TableHead className="text-xs font-semibold text-gray-600">Student / Course</TableHead>
                <TableHead className="text-xs font-semibold text-gray-600 text-right">Amount + Code</TableHead>
                <TableHead className="text-xs font-semibold text-gray-600">Method</TableHead>
                <TableHead className="text-xs font-semibold text-gray-600">Expires</TableHead>
                <TableHead className="text-xs font-semibold text-gray-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx: any) => (
                <TableRow key={tx.id} className="hover:bg-gray-50">
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {tx.transaction_id?.slice(0, 8)}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium text-gray-800">{tx.student_user_id?.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500">{tx.course_id?.slice(0, 12)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-semibold text-gray-800">
                      {formatAmount(tx.final_amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Code: {String(tx.unique_code).padStart(3, '0')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium capitalize">
                      {tx.payment_method}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Calendar size={12} />
                      {formatDate(tx.expires_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <ConfirmationModal
                        confirmationButtonText="Verify"
                        confirmationMessage={`Verify payment of ${formatAmount(tx.final_amount)}? Student will get course access.`}
                        dialogTitle="Verify Payment?"
                        dialogTrigger={
                          <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                            <Check size={13} />
                          </Button>
                        }
                        functionToExecute={() => handleVerify(tx.transaction_id)}
                        status="success"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setRejectingId(tx.transaction_id)}
                      >
                        <X size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > limit && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-500">
            Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PaymentsManualPage() {
  return (
    <div className="ml-10 mr-10 mx-auto bg-white rounded-xl nice-shadow px-4 py-4">
      <PaymentConfigSection />
      <hr className="my-8" />
      <TransactionsSection />
    </div>
  );
}
