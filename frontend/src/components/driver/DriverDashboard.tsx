import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { driverAPI, bankConfigAPI } from '../../services/api';
import AppPricingModal from './AppPricingModal';
import DownloadAppPage from './DownloadAppPage';
import DriverIncomePage from './DriverIncomePage';
import './DriverDashboard.css';


type User = {
  _id: string;
  name: string;
  phone: string;
  carType: string;
  carYear: string;
  carImage?: string;
  status: 'pending' | 'approved' | 'rejected';
};

type DriverDashboardProps = {
  user: User;
  onLogout: () => void;
  onBack?: () => void;
};

const DriverDashboard = ({ user, onLogout, onBack }: DriverDashboardProps) => {
  const [activeTab, setActiveTab] = useState<'home' | 'activity' | 'notifications' | 'account'>('home');
  const [isOnline, setIsOnline] = useState(false);
  const [balance, setBalance] = useState(200000);
  const [monthlyTrips, setMonthlyTrips] = useState(0);
  const [totalTrips, setTotalTrips] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage] = useState('');
  
  // Initialize withdraw state from localStorage
  const [withdrawRequested, setWithdrawRequested] = useState(() => {
    const saved = localStorage.getItem('withdraw_requested');
    return saved === 'true';
  });
  
  const [withdrawCooldown, setWithdrawCooldown] = useState(() => {
    const savedExpiry = localStorage.getItem('withdraw_expiry');
    if (savedExpiry) {
      const expiryTime = parseInt(savedExpiry, 10);
      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));
      return remainingSeconds;
    }
    return 0;
  });

  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showDownloadPage, setShowDownloadPage] = useState(false);
  const [showIncomePage, setShowIncomePage] = useState(false);
  const [payoneerEmail, setPayoneerEmail] = useState('khoinehihi06@gmail.com');
  const [copied, setCopied] = useState('');

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

  // Fetch driver stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await driverAPI.getStats();
        const { balance, monthlyTrips, totalTrips } = response.data;
        
        setBalance(balance);
        setMonthlyTrips(monthlyTrips);
        setTotalTrips(totalTrips);
      } catch (error) {
        console.error('Error fetching driver stats:', error);
        // Keep default values if error
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Countdown timer for withdraw cooldown
  useEffect(() => {
    if (withdrawCooldown > 0) {
      const timer = setTimeout(() => {
        setWithdrawCooldown(withdrawCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (withdrawCooldown === 0 && withdrawRequested) {
      // Clear localStorage when cooldown expires
      setWithdrawRequested(false);
      localStorage.removeItem('withdraw_requested');
      localStorage.removeItem('withdraw_expiry');
    }
  }, [withdrawCooldown, withdrawRequested]);

  return (
    <div className="driver-dashboard">
      {/* Back button */}
      {onBack && (
        <button className="back-button" onClick={onBack}>
          ← Back to Home
        </button>
      )}
      
      {/* Main Content */}
      <div className="driver-content">
        {activeTab === 'home' && (
          <motion.div 
            className="home-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >


            {/* Balance Card */}
            <div className="balance-card">
              <div className="balance-header">
                <div>
                  <h3>Current Balance</h3>
                  <p className="balance-subtitle">Your deposit minus completed rides</p>
                </div>
              </div>
              <div className="balance-amount">
                {loading ? '...' : `$${balance.toLocaleString('en-US')}`}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <button className="action-btn" onClick={() => setShowWithdrawModal(true)}>
                <span>Withdraw</span>
                <span className="arrow">›</span>
              </button>
              <button className="action-btn action-btn--income" onClick={() => setShowIncomePage(true)}>
                <span>💵 Driver Income</span>
                <span className="arrow">›</span>
              </button>
            </div>

            {/* Stats Card */}
            <div className="stats-section">
              <h3>Ride Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-icon">🛵</div>
                  <div className="stat-label">Rides completed this month</div>
                  <div className="stat-value">{loading ? '...' : monthlyTrips}</div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <div className="stat-icon stat-icon--success">✓</div>
                  <div className="stat-label">Total rides completed</div>
                  <div className="stat-value">{loading ? '...' : totalTrips}</div>
                </div>
              </div>
            </div>

            {/* Service Toggle */}
            <div className="service-toggle">
              <span className="toggle-label">Accept ride requests</span>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={isOnline}
                  onChange={(e) => setIsOnline(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div 
            className="activity-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Activity</h2>
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No activity yet</p>
            </div>
          </motion.div>
        )}

        {activeTab === 'notifications' && (
          <motion.div 
            className="notifications-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Notifications</h2>
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <p>No notifications yet</p>
            </div>
          </motion.div>
        )}

        {activeTab === 'account' && (
          <motion.div 
            className="account-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Account</h2>
            <div className="account-info">
              <div className="account-avatar">
                {user.carImage ? (
                  <img src={user.carImage} alt="Car" />
                ) : (
                  <div className="avatar-placeholder">🚗</div>
                )}
              </div>
              <div className="account-details">
                <h3>{user.name}</h3>
                <p>{user.phone}</p>
                <p className="car-info">{user.carType} - {user.carYear}</p>
                <span className="status-badge approved">Approved</span>
              </div>
            </div>
            <button className="logout-btn" onClick={onLogout}>
              🚪 Log Out
            </button>
          </motion.div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">Activity</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <span className="nav-icon">🔔</span>
          <span className="nav-label">Notifications</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Account</span>
        </button>
      </nav>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="modal" role="dialog" aria-modal="true">
            <motion.div 
              className="modal__backdrop" 
              onClick={() => setShowWithdrawModal(false)} 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
            />
            <motion.div 
              className="modal__panel" 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 20 }}
              style={{ maxWidth: '440px', width: '95%', padding: 0, overflow: 'hidden', borderRadius: '16px' }}
            >
              <div className="modal__header" style={{ backgroundColor: '#1b365d', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                <div className="modal__title" style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px' }}>Withdraw Deposit: $200.00 USD</div>
                <button className="modal__close" onClick={() => setShowWithdrawModal(false)} aria-label="Close" style={{ color: 'white', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.2s', padding: 0, margin: 0, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: '20px', overflowY: 'auto', flex: 1, maxHeight: 'calc(90vh - 60px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ marginTop: 0, marginBottom: 0, color: '#475569', fontSize: '14px', lineHeight: '1.5', textAlign: 'center' }}>
                  To withdraw your deposit and close your account, please send $200 USD via Payoneer. Admin will refund your full deposit within 24 hours.
                </p>
                
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Payoneer Logo */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <svg width="24" height="24" viewBox="0 0 100 100" style={{ transform: 'rotate(-10deg)' }}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#payoneerGrad3)" strokeWidth="12" />
                      <defs>
                        <linearGradient id="payoneerGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
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
                      <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', marginTop: '2px' }}>$200.00 USD</div>
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
                        Withdraw Deposit - <span style={{ color: '#2563eb' }}>{user.name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    className="submit"
                    disabled={withdrawRequested}
                    onClick={() => {
                      const expiryTime = Date.now() + 60000; // 60 seconds from now
                      
                      setWithdrawRequested(true);
                      setWithdrawCooldown(60);
                      
                      localStorage.setItem('withdraw_requested', 'true');
                      localStorage.setItem('withdraw_expiry', expiryTime.toString());
                      
                      alert('Withdrawal request submitted. Admin will process it within 24 hours.');
                    }}
                    style={{
                      backgroundColor: withdrawRequested ? '#e2e8f0' : '#22c55e',
                      color: withdrawRequested ? '#94a3b8' : 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px',
                      fontSize: withdrawRequested ? '13px' : '15px',
                      fontWeight: '700',
                      cursor: withdrawRequested ? 'not-allowed' : 'pointer',
                      flex: 1,
                      boxShadow: withdrawRequested ? 'none' : '0 4px 6px rgba(34, 197, 94, 0.2)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (!withdrawRequested) e.currentTarget.style.backgroundColor = '#16a34a';
                    }}
                    onMouseOut={(e) => {
                      if (!withdrawRequested) e.currentTarget.style.backgroundColor = '#22c55e';
                    }}
                  >
                    {withdrawRequested 
                      ? `Request submitted — waiting for admin. Try again in ${withdrawCooldown}s`
                      : 'I Have Sent $200 - Continue'
                    }
                  </button>
                  <button
                    onClick={() => setShowWithdrawModal(false)}
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Popup for Fake Notifications */}
      <AnimatePresence>
        {showErrorPopup && (
          <div className="error-popup-overlay" onClick={() => setShowErrorPopup(false)}>
            <motion.div
              className="error-popup"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <div className="error-popup-icon">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  ⚠️
                </motion.div>
              </div>
              <h3 className="error-popup-title">Ride Taken</h3>
              <p className="error-popup-message">{errorMessage}</p>
              <button
                className="error-popup-btn"
                onClick={() => setShowErrorPopup(false)}
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AppPricingModal 
        isOpen={showPricingModal} 
        onClose={() => setShowPricingModal(false)}
        onConfirm={(plan) => {
          localStorage.setItem('driver_app_plan', plan.id);
          setShowPricingModal(false);
          setShowDownloadPage(true);
        }}
      />

      {showDownloadPage && (
        <DownloadAppPage 
          user={user} 
          onBack={() => setShowDownloadPage(false)} 
        />
      )}

      {/* Income Page Overlay */}
      {showIncomePage && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: '#f5f5f5',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}>
          <DriverIncomePage onBack={() => setShowIncomePage(false)} />
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
