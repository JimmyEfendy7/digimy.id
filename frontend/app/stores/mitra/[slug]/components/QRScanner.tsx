'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, X, CheckCircle, AlertCircle, Scan, Users, TrendingUp } from 'lucide-react';
import { scanQRCode, getStoreScannedQRs, getQRScanStats } from '@/app/lib/api';

interface ScannedQR {
  id: number;
  transaction_code: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  product_name: string;
  product_image: string;
  quantity: number;
  price: number;
  is_scan: boolean;
  created_at: string;
  updated_at: string;
}

interface ScanStats {
  total_appointments: number;
  scanned_appointments: number;
  pending_appointments: number;
  total_appointment_revenue: number;
  scanned_revenue: number;
}

interface QRScannerProps {
  storeId: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ storeId }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [scannedQRs, setScannedQRs] = useState<ScannedQR[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReader = useRef<BrowserMultiFormatReader>(new BrowserMultiFormatReader());

  // Fetch scanned QRs and stats on component mount
  useEffect(() => {
    fetchScannedQRs();
    fetchStats();
  }, [storeId]);

  const fetchScannedQRs = async () => {
    try {
      const response = await getStoreScannedQRs(storeId);
      if (response.success) {
        setScannedQRs(response.data);
      }
    } catch (error) {
      console.error('Error fetching scanned QRs:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getQRScanStats(storeId);
      if (response.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const startScanning = async () => {
    setError('');
    setScanResult(null);
    setLoading(true);

    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera if available
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        setLoading(false);

        // Start scanning
        codeReader.current.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
          if (result) {
            handleScanResult(result.getText());
          }
        });
      }
    } catch (err: any) {
      setError('Tidak dapat mengakses kamera. Pastikan Anda memberikan izin akses kamera.');
      setLoading(false);
      console.error('Camera access error:', err);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    codeReader.current.reset();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleScanResult = async (qrData: string) => {
    setLoading(true);
    stopScanning();

    try {
      const response = await scanQRCode(storeId, qrData);
      
      if (response.success) {
        setScanResult({
          ...response.data,
          success: true
        });
        // Refresh the scanned QRs list
        fetchScannedQRs();
        fetchStats();
      } else {
        setScanResult({
          success: false,
          message: response.message
        });
      }
    } catch (error: any) {
      setScanResult({
        success: false,
        message: error.message || 'Gagal memproses QR code'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Appointment</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_appointments}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Sudah Scan</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scanned_appointments}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Menunggu Scan</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_appointments}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(stats.total_appointment_revenue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">QR Code Scanner</h2>
          {!isScanning && !scanResult && (
            <button
              onClick={startScanning}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Camera className="h-4 w-4 mr-2" />
              {loading ? 'Memuat...' : 'Mulai Scan'}
            </button>
          )}
        </div>

        {/* Camera View */}
        {isScanning && (
          <div className="relative mb-4">
            <video
              ref={videoRef}
              className="w-full max-w-md mx-auto rounded-lg"
              autoPlay
              playsInline
            />
            <button
              onClick={stopScanning}
              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white border-dashed w-48 h-48 rounded-lg"></div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <Scan className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Memproses QR code...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className={`border rounded-lg p-4 mb-4 ${
            scanResult.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center mb-2">
              {scanResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              )}
              <h3 className={`font-semibold ${
                scanResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {scanResult.success ? 'QR Code Berhasil Dipindai!' : 'QR Code Tidak Valid'}
              </h3>
            </div>
            
            {scanResult.success && scanResult.transaction_code && (
              <div className="space-y-2">
                <p><strong>No. Transaksi:</strong> {scanResult.transaction_code}</p>
                <p><strong>Customer:</strong> {scanResult.customer_name}</p>
                <p><strong>Produk:</strong> {scanResult.product_name}</p>
                <p><strong>Total:</strong> {formatCurrency(scanResult.total_amount)}</p>
                <p><strong>Status:</strong> 
                  <span className="ml-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    Berhasil Dipindai
                  </span>
                </p>
              </div>
            )}
            
            {!scanResult.success && (
              <p className="text-red-700">{scanResult.message}</p>
            )}
            
            <button
              onClick={() => setScanResult(null)}
              className="mt-3 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Scan Lagi
            </button>
          </div>
        )}
      </div>

      {/* Scanned QRs List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Riwayat Scan QR</h2>
        </div>
        <div className="divide-y">
          {scannedQRs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Scan className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Belum ada QR code yang dipindai</p>
            </div>
          ) : (
            scannedQRs.map((qr) => (
              <div key={qr.id} className="p-6 flex items-center space-x-4">
                <img
                  src={qr.product_image}
                  alt={qr.product_name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{qr.product_name}</h3>
                  <p className="text-sm text-gray-600">
                    {qr.customer_name} • {qr.customer_phone}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDate(qr.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(qr.total_amount)}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    qr.is_scan
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {qr.is_scan ? 'Sudah Scan' : 'Belum Scan'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
