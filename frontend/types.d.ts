/// <reference types="react" />

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Definisi tipe untuk objek global
interface MidtransResult {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    snap: {
      pay: (snapToken: string, options?: {
        onSuccess?: (result: MidtransResult) => void;
        onPending?: (result: MidtransResult) => void;
        onError?: (result: MidtransResult) => void;
        onClose?: () => void;
        language?: string;
        autoCloseDelay?: number;
        selectedPaymentType?: string;
        uiMode?: string;
      }) => void;
      show: () => void;
      hide: () => void;
    }
  }
}

export {}; 