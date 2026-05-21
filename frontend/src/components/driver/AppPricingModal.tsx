import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Plan = {
  id: string;
  label: string;
  months: number;
  price: number;
  badge: string | null;
  description: string;
};

const PLANS: Plan[] = [
  { id: '1y', label: '1 Year', months: 12, price: 20, badge: 'Popular ⭐', description: 'Best value for ongoing use' },
  { id: 'lifetime', label: 'Lifetime', months: 9999, price: 50, badge: 'Best 👑', description: 'Pay once — use forever' },
];

type AppPricingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (plan: Plan) => void;
};

const AppPricingModal: React.FC<AppPricingModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('1y');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const plan = PLANS.find((p) => p.id === selectedPlanId);
    if (plan) {
      onConfirm(plan);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal" role="dialog" aria-modal="true" style={{ zIndex: 9999 }}>
          <motion.div
            className="modal__backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="modal__panel pricing-modal-panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            style={{ maxWidth: '500px', width: '90%', padding: 0, overflow: 'hidden' }}
          >
            <div className="pricing-header">
              <h2 className="pricing-title">Choose Your App Plan</h2>
              <p className="pricing-subtitle">Select a plan to download and use the driver app</p>
            </div>

            <div className="pricing-body">
              <div id="joyride-pricing-cards" className="pricing-cards">
                {PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`pricing-card ${selectedPlanId === plan.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
                    <div className="pricing-card-content">
                      <div className="pricing-radio">
                        <div className={`radio-inner ${selectedPlanId === plan.id ? 'active' : ''}`} />
                      </div>
                      <div className="pricing-info">
                        <div className="pricing-label">{plan.label}</div>
                        <div className="pricing-desc">{plan.description}</div>
                      </div>
                      <div className="pricing-price">${plan.price}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pricing-note">
                <span className="note-icon">💡</span>
                <p>
                  <strong>Note:</strong> Even if you stop using the app, you can still withdraw your deposit at any time.
                </p>
              </div>
            </div>

            <div className="pricing-footer">
              <button className="pricing-btn-cancel" onClick={onClose}>
                Later
              </button>
              <button className="pricing-btn-confirm" onClick={handleConfirm}>
                Confirm &amp; Pay
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AppPricingModal;
