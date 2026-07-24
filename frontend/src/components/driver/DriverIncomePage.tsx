import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { driverAPI } from '../../services/api';
import './DriverIncomePage.css';

type IncomeHistory = {
  date: string;   // e.g. "06/20"
  amount: number;
};

type IncomeData = {
  totalIncome: number;
  completedRidesAmount: number;
  tipsAmount: number;
  history: IncomeHistory[];
};

type Props = {
  onBack: () => void;
};

const DriverIncomePage = ({ onBack }: Props) => {
  const [income, setIncome] = useState<IncomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncome = async () => {
      try {
        setLoading(true);
        const res = await driverAPI.getIncome();
        if (res.data?.success) {
          setIncome(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching income:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIncome();
  }, []);

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US');

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="income-page">
      {/* Header */}
      <div className="income-header">
        <button className="income-back-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1 className="income-header-title">DRIVER EARNINGS</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="income-body">
        {loading ? (
          <div className="income-loading">
            <div className="income-loading-spinner" />
            <p>Loading data...</p>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Total income card */}
              <div className="income-total-card">
                <div className="income-total-top">
                  <div>
                    <p className="income-total-label">
                      Total earnings for {monthLabel}
                    </p>
                    <p className="income-total-sublabel">(As of today)</p>
                  </div>
                  <div className="income-bag-icon">💰</div>
                </div>
                <div className="income-total-amount">
                  {fmt(income?.totalIncome ?? 0)}
                </div>
                <p className="income-total-note">
                  *This is the total amount you have earned.
                </p>
              </div>

              {/* Detail table */}
              <div className="income-section">
                <h2 className="income-section-title">EARNINGS BREAKDOWN</h2>
                <div className="income-table">
                  <div className="income-table-header">
                    <span>Source</span>
                    <span>Amount</span>
                  </div>
                  <div className="income-table-row">
                    <span>Completed rides</span>
                    <span className="income-table-value">
                      {fmt(income?.completedRidesAmount ?? 0)}
                    </span>
                  </div>
                  <div className="income-table-row">
                    <span>Customer tips</span>
                    <span className="income-table-value">
                      {fmt(income?.tipsAmount ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment history */}
              {(income?.history ?? []).length > 0 && (
                <div className="income-section">
                  <h2 className="income-section-title">Payment history</h2>
                  <div className="income-history-list">
                    {income!.history.map((item, idx) => (
                      <motion.div
                        key={idx}
                        className="income-history-row"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <span className="income-history-date">{item.date}</span>
                        <span className="income-history-amount">
                          ${item.amount.toLocaleString('en-US')}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {(income?.totalIncome ?? 0) === 0 && (
                <div className="income-empty">
                  <div className="income-empty-icon">💸</div>
                  <p>No earnings this month yet</p>
                  <span>Complete rides to start earning!</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default DriverIncomePage;
