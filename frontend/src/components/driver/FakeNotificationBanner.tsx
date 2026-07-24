import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { driverFakeNotificationsAPI } from '../../services/api';
import './DriverDashboard.css'; // Reuse styles

type Props = {
  user?: {
    status: string;
    [key: string]: any;
  } | null;
  region?: 'north' | 'central' | 'south';
  onRequireAuth?: () => void;
};

const FakeNotificationBanner = ({ user, region = 'north', onRequireAuth }: Props) => {
  const [fakeNotifications, setFakeNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [acceptingNotificationId, setAcceptingNotificationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFakeNotifications = async (currentRegion: string) => {

    try {
      setLoadingNotifications(true);
      const response = await driverFakeNotificationsAPI.getFakeNotifications(currentRegion);
      
      const newNotifications = response.data.data || [];
      // Only update state if we actually got new notifications to avoid flickering empty state
      if (newNotifications.length > 0) {
        setFakeNotifications(newNotifications);
        
        // Send push notification to outside system (Desktop / Mobile Push Notification)
        if ('Notification' in window && Notification.permission === 'granted') {
          const notif = newNotifications[0];
          const systemNotification = new Notification(`🔔 New ${notif.carType}-seat ride available!`, {
            body: `${notif.startPoint} ➡️ ${notif.endPoint}\nPrice: $${notif.price}`,
            icon: '/vite.svg', // Icon mặc định của web
            requireInteraction: true // Giữ thông báo trên màn hình cho đến khi user tắt hoặc click
          });

          // If user clicks on the push notification, focus the browser again
          systemNotification.onclick = () => {
            window.focus();
            systemNotification.close();
          };
        }
        
        // Auto hide after 30 seconds
        if (autoHideRef.current) clearTimeout(autoHideRef.current);
        autoHideRef.current = setTimeout(() => {
          setFakeNotifications([]);
        }, 30000);
        
      } else {
        // If empty, we can choose to clear it or keep the old one until next tick
        // Let's clear it if they wanted to reset
        setFakeNotifications([]);
      }
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      let min = 15;
      let max = 30;
      if (response.data.settings) {
        min = response.data.settings.minInterval || 15;
        max = response.data.settings.maxInterval || 30;
      }
      
      const randomMinutes = Math.floor(Math.random() * (max - min + 1)) + min;
      timeoutRef.current = setTimeout(() => {
        fetchFakeNotifications(currentRegion);
      }, randomMinutes * 60 * 1000);

    } catch (error: any) {
      console.error('Error fetching fake notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (user?.status === 'approved') {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    fetchFakeNotifications(region);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
    };
  }, [user?.status, region]);

  const handleAcceptFakeNotification = async (notificationId: string) => {
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    
    try {
      setAcceptingNotificationId(notificationId);
      await driverFakeNotificationsAPI.acceptFakeNotification(notificationId);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Another driver already accepted this ride. Please wait for the next one.';
      setErrorMessage(message);
      setShowErrorPopup(true);
      // Remove the notification after failure
      setTimeout(() => {
        setFakeNotifications(prev => prev.filter(n => n._id !== notificationId));
        setShowErrorPopup(false);
      }, 3000);
    } finally {
      setAcceptingNotificationId(null);
    }
  };

  if (fakeNotifications.length === 0 && !showErrorPopup) return null;

  return (
    <div className="fake-notifications-section" style={{ margin: '15px 10px', borderRadius: '12px', padding: '16px' }}>
      <div className="section-header">
        <h3 style={{ fontSize: '1rem' }}>🔔 Ride requests available for you</h3>
        {loadingNotifications ? (
          <span className="loading-spinner">⟳</span>
        ) : (
          <span className="ride-latest-badge">Latest</span>
        )}
      </div>
      
      <AnimatePresence>
        {fakeNotifications.length > 0 && (
          <div className="fake-notifications-list">
            {fakeNotifications.map((notification, index) => (
              <motion.div
                key={notification._id}
                className="fake-notification-card"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                style={{ marginBottom: '12px' }}
              >
                <div className="ride-card-header">
                  <span className="ride-time-wrap">
                    <span className="ride-time-icon">🕐</span>
                    <span className="ride-time-text">
                      {(() => {
                        const d = notification.displayDate ? new Date(notification.displayDate) : new Date();
                        const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
                        const dateStr = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                        return `${notification.displayTime} · ${weekday}, ${dateStr}`;
                      })()}
                    </span>
                  </span>
                </div>

                <div className="ride-summary-container">
                  <div className="ride-summary-row">
                    <div className="ride-cartype">🚗 Driver needed · {notification.carType}-seat</div>
                    <span className="ride-price-block">
                      <span className="ride-price">${notification.price.toLocaleString('en-US')}</span>
                      <span className="ride-price-label">Trip price</span>
                    </span>
                  </div>
                  <div className="ride-summary-route">
                    <span className="ride-pin ride-pin-start">📍</span>
                    <span className="ride-summary-point ride-point-start">{notification.startPoint}</span>
                    <span className="ride-summary-arrow">→</span>
                    <span className="ride-pin ride-pin-end">📍</span>
                    <span className="ride-summary-point ride-point-end">{notification.endPoint}</span>
                  </div>
                </div>

                <div className="ride-timeline">
                  <div className="ride-timeline-row">
                    <span className="ride-marker ride-marker-start" />
                    <div className="ride-timeline-content">
                      <div className="ride-point-head">
                        <span className="ride-badge ride-badge-start">📍 Pickup</span>
                        <div className="ride-point-name">{notification.startDetail || notification.startPoint}</div>
                      </div>
                      {notification.startArea && (
                        <div className="ride-point-area">Area: {notification.startArea}</div>
                      )}
                    </div>
                  </div>
                  <div className="ride-timeline-connector" />
                  <div className="ride-timeline-row">
                    <span className="ride-marker ride-marker-end" />
                    <div className="ride-timeline-content">
                      <div className="ride-point-head">
                        <span className="ride-badge ride-badge-end">📍 Drop-off</span>
                        <div className="ride-point-name">{notification.endDetail || notification.endPoint}</div>
                      </div>
                      {notification.endArea && (
                        <div className="ride-point-area">Area: {notification.endArea}</div>
                      )}
                    </div>
                  </div>
                </div>

                {notification.note && (
                  <div className="ride-note-box">
                    <span className="ride-note-icon">📋</span>
                    <span className="ride-note-text">
                      <strong>Special request:</strong> {notification.note}
                    </span>
                  </div>
                )}

                <button
                  className="accept-ride-btn"
                  onClick={() => {
                    if (!user || user.status !== 'approved') {
                      if (onRequireAuth) onRequireAuth();
                      return;
                    }
                    handleAcceptFakeNotification(notification._id);
                  }}
                  disabled={acceptingNotificationId === notification._id}
                >
                  {acceptingNotificationId === notification._id ? 'Processing...' : 'Accept ride now  ›'}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Error Popup Modal */}
      <AnimatePresence>
        {showErrorPopup && (
          <motion.div 
            className="error-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <motion.div 
              className="error-popup-content"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              style={{
                background: 'white', padding: '20px', borderRadius: '12px',
                textAlign: 'center', maxWidth: '300px', width: '90%'
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
              <h3 style={{ color: '#e74c3c', marginBottom: '10px' }}>Sorry!</h3>
              <p style={{ color: '#333', marginBottom: '20px', lineHeight: '1.5' }}>{errorMessage}</p>
              <button 
                onClick={() => setShowErrorPopup(false)}
                style={{
                  background: '#e74c3c', color: 'white', border: 'none',
                  padding: '10px 20px', borderRadius: '8px', width: '100%',
                  fontWeight: 'bold'
                }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FakeNotificationBanner;
