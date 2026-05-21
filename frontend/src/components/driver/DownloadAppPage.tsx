import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { driverAPI, bankConfigAPI } from '../../services/api';
import './DownloadAppPage.css';

type User = {
  _id: string;
  name: string;
  phone: string;
  carType: string;
  carYear: string;
  carImage?: string;
  status: 'pending' | 'approved' | 'rejected';
};

type DownloadAppPageProps = {
  user: User;
  plan?: string;
  onBack: () => void;
  onDownloaded?: (plan: string) => void;
};

const SECRET_PASS = '838668';

const DownloadAppPage: React.FC<DownloadAppPageProps> = ({ user, plan = '1y', onBack, onDownloaded }) => {
  let amount = 20;
  let planLabel = '1 Year';
  if (plan === 'lifetime') { amount = 50; planLabel = 'Lifetime'; }

  const message = `App Download ${user.phone}`;
  const [paypalMe, setPaypalMe] = React.useState((import.meta as any).env?.VITE_PAYPAL_ME || '');
  React.useEffect(() => {
    bankConfigAPI.getBankConfig().then((res: any) => {
      if (res.data?.data?.paypalMe) setPaypalMe(res.data.data.paypalMe);
    }).catch(() => {});
  }, []);
  const paypalUrl = `https://paypal.me/${paypalMe || 'YOURPAYPALID'}/${amount}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(paypalUrl)}&bgcolor=ffffff&color=003087&margin=10`;

  // Step: 'qr' | 'showpass' | 'enterpass'
  const [step, setStep] = useState<'qr' | 'showpass' | 'enterpass'>('qr');
  const [countdown, setCountdown] = useState(10);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadCountdown, setDownloadCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const downloadRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown for showpass step (10s)
  useEffect(() => {
    if (step === 'showpass') {
      setCountdown(10);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            setStep('enterpass');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [step]);

  // Countdown 3s before auto download
  useEffect(() => {
    if (downloading) {
      setDownloadCountdown(3);
      downloadRef.current = setInterval(() => {
        setDownloadCountdown(prev => {
          if (prev <= 1) {
            clearInterval(downloadRef.current!);
            triggerDownload();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (downloadRef.current) clearInterval(downloadRef.current);
    };
  }, [downloading]);

  const triggerDownload = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const baseUrl = apiUrl.replace('/api', '');
    window.location.href = `${baseUrl}/api/download/app`;

    try {
      await driverAPI.recordDownload(plan);
      if (onDownloaded) onDownloaded(plan);
    } catch (err) {
      console.error('Failed to record download:', err);
    }

    setTimeout(() => onBack(), 1000);
  };

  const handleConfirmPayment = () => {
    setStep('enterpass');
  };

  const handlePassSubmit = () => {
    if (passInput === SECRET_PASS) {
      setPassError('');
      setDownloading(true);
    } else {
      setPassError('Incorrect password. Please try again!');
      setPassInput('');
    }
  };

  return (
    <AnimatePresence>
      <div className="modal" role="dialog" aria-modal="true" style={{ zIndex: 9999 }}>
        <motion.div
          className="modal__backdrop"
          onClick={onBack}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* STEP 1: QR + Payment */}
        {step === 'qr' && (
          <motion.div
            className="modal__panel download-modal-panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
          >
            <div className="download-header-modal">
              <h2>Download App</h2>
              <button className="modal__close" onClick={onBack} aria-label="Close" style={{ color: '#64748b', fontSize: '24px', top: '15px', right: '15px' }}>×</button>
            </div>
            <div className="download-body-modal">
              <p className="greeting-text">Hello <strong>{user.name}</strong>, your account has been approved!</p>
              <p className="subtitle-text">Pay via PayPal to download and install the app</p>
              <div className="qr-section">
                <div className="qr-wrapper">
                  <img src={qrCodeUrl} alt="PayPal QR" className="qr-image" style={{ borderRadius: 12 }} />
                </div>
                <div className="download-badges">
                  <span className="badge android">Android APK</span>
                </div>
                <div className="payment-info" style={{ marginTop: '16px', background: '#eff6ff', padding: '12px', borderRadius: '12px', width: '100%', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '14px', color: '#475569', marginBottom: '4px' }}>Subscription fee ({planLabel}):</div>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2563eb' }}>${amount}</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                    PayPal note: <strong style={{ color: '#0f172a' }}>{message}</strong>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 8 }}>
                  Or open: <a href={paypalUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0070ba', fontWeight: 700 }}>paypal.me/{paypalMe}/{amount}</a>
                </div>
              </div>
              <button
                className="btn-download-primary"
                onClick={handleConfirmPayment}
                style={{ marginTop: '16px' }}
              >
                I have paid
              </button>
              <div className="download-footer">
                <p className="guarantee-note">
                  <span className="icon">🛡️</span>
                  Deposit is fully refundable even if you stop using the app
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Show password for 10s */}
        {step === 'showpass' && (
          <motion.div
            className="modal__panel"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ maxWidth: '360px', width: '90%', padding: '32px 24px', textAlign: 'center', borderRadius: '20px' }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>
              App Download Password
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Remember this password — it will hide in <strong style={{ color: '#e74c3c' }}>{countdown}s</strong>
            </p>

            {/* Password display */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '8px', color: 'white', fontFamily: 'monospace' }}>
                {SECRET_PASS}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
                App download confirmation code
              </div>
            </div>

            {/* Countdown ring */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: countdown > 5 ? '#22c55e' : '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '16px',
                transition: 'background 0.3s'
              }}>
                {countdown}
              </div>
              <span style={{ fontSize: '13px', color: '#64748b' }}>seconds left</span>
            </div>

            <button
              onClick={() => {
                if (countdownRef.current) clearInterval(countdownRef.current);
                setStep('enterpass');
              }}
              style={{
                background: '#1e293b', color: 'white', border: 'none',
                borderRadius: '12px', padding: '12px 24px', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer', width: '100%'
              }}
            >
              Got it, continue →
            </button>
          </motion.div>
        )}

        {/* STEP 3: Enter password */}
        {step === 'enterpass' && (
          <motion.div
            className="modal__panel"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ maxWidth: '360px', width: '90%', padding: '32px 24px', textAlign: 'center', borderRadius: '20px' }}
          >
            {!downloading ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔑</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>
                  Enter password to download
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
                  Enter the password provided by admin to download the app
                </p>

                <input
                  type="password"
                  value={passInput}
                  onChange={(e) => {
                    setPassInput(e.target.value);
                    setPassError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePassSubmit()}
                  placeholder="Enter password..."
                  autoFocus
                  style={{
                    width: '100%', padding: '14px 16px', fontSize: '18px',
                    border: passError ? '2px solid #ef4444' : '2px solid #e2e8f0',
                    borderRadius: '12px', textAlign: 'center', letterSpacing: '4px',
                    outline: 'none', marginBottom: '12px', boxSizing: 'border-box',
                    fontFamily: 'monospace'
                  }}
                />

                {passError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}
                  >
                    ❌ {passError}
                  </motion.p>
                )}

                <button
                  onClick={handlePassSubmit}
                  disabled={!passInput}
                  style={{
                    background: passInput ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e2e8f0',
                    color: passInput ? 'white' : '#94a3b8',
                    border: 'none', borderRadius: '12px', padding: '14px',
                    fontSize: '15px', fontWeight: 700, cursor: passInput ? 'pointer' : 'not-allowed',
                    width: '100%', transition: 'all 0.2s'
                  }}
                >
                  Confirm & Download
                </button>

                <button
                  onClick={onBack}
                  style={{
                    background: 'none', border: 'none', color: '#94a3b8',
                    fontSize: '13px', marginTop: '12px', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>
                  Verified!
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                  Download will start in <strong style={{ color: '#2563eb', fontSize: '20px' }}>{downloadCountdown}</strong> seconds...
                </p>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  border: '4px solid #e2e8f0', borderTopColor: '#2563eb',
                  animation: 'spin 1s linear infinite', margin: '0 auto'
                }} />
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default DownloadAppPage;
