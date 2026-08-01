/**
 * useRazorpay — dynamically loads the Razorpay checkout script
 * and exposes an `openPayment` function.
 */

import { useState, useCallback } from 'react';
import api from './api';

const loadScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const isTestKey = (key) => key && key.startsWith('rzp_test_');

export function useRazorpay() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openPayment = useCallback(async ({ listingId, rentalId = null, onSuccess, onFailure }) => {
    setLoading(true);
    setError('');

    try {
      const scriptLoaded = await loadScript();
      if (!scriptLoaded) {
        setError('Failed to load payment gateway. Check your internet connection.');
        setLoading(false);
        return;
      }

      // Create order on backend
      const { data } = await api.post('/payments/create-order', { listingId, rentalId });

      const testMode = isTestKey(data.keyId);

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'TradeHub Campus Marketplace',
        description: data.listingTitle,
        order_id: data.orderId,
        theme: { color: '#0F9D9D' },

        // In test mode pre-fill with test card so user can pay in one click
        prefill: testMode ? {
          name: 'Test Buyer',
          email: 'test@tradehub.com',
          contact: '9999999999',
          // Pre-select card method with test card number
          method: 'card',
        } : {},

        // Force card as the default selected method in test mode
        // and hide UPI QR (which doesn't work in test) — show only card & netbanking
        config: {
          display: {
            blocks: {
              card: { name: 'Pay by Card', instruments: [{ method: 'card' }] },
              nb:   { name: 'Net Banking',  instruments: [{ method: 'netbanking' }] },
              ...(testMode ? {} : {
                upi: { name: 'UPI', instruments: [{ method: 'upi' }] },
                wallet: { name: 'Wallets', instruments: [{ method: 'wallet' }] },
              }),
            },
            sequence: testMode
              ? ['block.card', 'block.nb']
              : ['block.upi', 'block.card', 'block.nb', 'block.wallet'],
            preferences: { show_default_blocks: false },
          },
        },

        modal: {
          backdropclose: false,
          escape: true,
          handleback: true,
          confirm_close: true,
          ondismiss: () => {
            setLoading(false);
            if (onFailure) onFailure('Payment cancelled.');
          },
        },

        handler: async (response) => {
          try {
            const verify = await api.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setLoading(false);
            if (onSuccess) onSuccess(verify.data);
          } catch (err) {
            setLoading(false);
            const msg = err.response?.data?.msg || 'Payment verification failed.';
            setError(msg);
            if (onFailure) onFailure(msg);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setLoading(false);
        const msg = response.error?.description || 'Payment failed.';
        setError(msg);
        if (onFailure) onFailure(msg);
      });
      rzp.open();
    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.msg || 'Could not initiate payment. Please try again.';
      setError(msg);
      if (onFailure) onFailure(msg);
    }
  }, []);

  return { openPayment, loading, error, setError };
}
