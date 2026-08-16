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
  let amount = 35;
  if (plan === 'lifetime') { amount = 80; }

  // Step: 'qr' | 'showpass' | 'enterpass'
  const [step, setStep] = useState<'qr' | 'showpass' | 'enterpass'>('qr');
  const [countdown, setCountdown] = useState(10);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadCountdown, setDownloadCountdown] = useState(3);
  const [payoneerEmail, setPayoneerEmail] = useState('khoinehihi06@gmail.com');
  const [copied, setCopied] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const downloadRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await bankConfigAPI.getBankConfig();
        if (res.data?.success && res.data?.data?.payoneerEmail) {
          setPayoneerEmail(res.data.data.payoneerEmail);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

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
            style={{ maxWidth: '440px', width: '95%', padding: 0, overflow: 'hidden', borderRadius: '16px' }}
          >
            <div className="download-header-modal" style={{ backgroundColor: '#1b365d', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', borderBottom: 'none' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px', color: 'white', margin: 0 }}>Group Access Fee: ${amount}.00 USD</h2>
              <button className="modal__close" onClick={onBack} aria-label="Close" style={{ color: 'white', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', opacity: 0.8, position: 'static', padding: 0 }}>×</button>
            </div>
            <div className="download-body-modal" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p className="greeting-text" style={{ margin: 0, color: '#0f172a', fontSize: '14.5px', lineHeight: '1.5', textAlign: 'center', fontWeight: '600' }}>
                Hello <strong>{user.name}</strong>, your account has been approved!
              </p>
              <p className="subtitle-text" style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.5', textAlign: 'center' }}>
                Please complete your payment via Payoneer to download the app. {amount} dollars
              </p>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Payoneer Logo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg width="24" height="24" viewBox="0 0 100 100" style={{ transform: 'rotate(-10deg)' }}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="url(#payoneerGrad2)" strokeWidth="12" />
                    <defs>
                      <linearGradient id="payoneerGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ff4f1a" />
                        <stop offset="50%" stopColor="#ff007f" />
                        <stop offset="100%" stopColor="#00aaff" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Payoneer</span>
                </div>

                {/* Recipient Email Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" style={{ margin: 'auto' }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Recipient Email:</div>
                    <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', wordBreak: 'break-all', marginTop: '2px' }}>{payoneerEmail}</div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(payoneerEmail);
                        setCopied('email');
                        setTimeout(() => setCopied(''), 2000);
                      }}
                      style={{
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '8px',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.15)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      {copied === 'email' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Amount Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontWeight: '800', color: '#475569', fontSize: '16px' }}>$</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Amount:</div>
                    <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', marginTop: '2px' }}>${amount}.00 USD</div>
                  </div>
                </div>

                {/* Note Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" style={{ margin: 'auto' }}>
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Payment Note:</div>
                    <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '700', marginTop: '2px' }}>
                      App Subscription Fee - <span style={{ color: '#2563eb' }}>{user.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={handleConfirmPayment}
                  style={{
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    flex: 1,
                    boxShadow: '0 4px 6px rgba(34, 197, 94, 0.2)',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                >
                  I Have Sent ${amount} - Continue
                </button>
                <button
                  onClick={onBack}
                  style={{
                    backgroundColor: '#f3f4f6',
                    color: '#4b5563',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    flex: 1,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  Maybe Later
                </button>
              </div>
              <div className="download-footer" style={{ marginTop: '4px', borderTop: 'none', paddingTop: 0 }}>
                <p className="guarantee-note" style={{ margin: 0, justifyContent: 'center' }}>
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
