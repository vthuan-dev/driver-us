import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { FakeNotification } from './FakeNotificationsTab';

type FormData = {
  region: 'north' | 'central' | 'south';
  startPoint: string;
  endPoint: string;
  startArea: string;
  endArea: string;
  startDetail: string;
  endDetail: string;
  displayTime: string;
  displayDate: string;
  carType: '4' | '7' | '16';
  price: number;
  isActive: boolean;
  note: string;
};

type Props = {
  template: FakeNotification | null;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
};

// US states grouped by region (north=Northeast & Midwest, central=South, south=West)
const provincesByRegion: Record<string, string[]> = {
  north: [
    'Connecticut', 'Delaware', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Missouri', 'Nebraska', 'New Hampshire', 'New Jersey',
    'New York', 'North Dakota', 'Ohio', 'Pennsylvania', 'Rhode Island',
    'South Dakota', 'Vermont', 'Wisconsin'
  ],
  central: [
    'Alabama', 'Arkansas', 'Florida', 'Georgia', 'Kentucky',
    'Louisiana', 'Mississippi', 'North Carolina', 'Oklahoma', 'South Carolina',
    'Tennessee', 'Texas', 'Virginia', 'West Virginia'
  ],
  south: [
    'Alaska', 'Arizona', 'California', 'Colorado', 'Hawaii',
    'Idaho', 'Montana', 'Nevada', 'New Mexico', 'Oregon',
    'Utah', 'Washington', 'Wyoming'
  ]
};

const FakeNotificationForm = ({ template, onSubmit, onCancel }: Props) => {
  const [formData, setFormData] = useState<FormData>({
    region: 'north',
    startPoint: '',
    endPoint: '',
    startArea: '',
    endArea: '',
    startDetail: '',
    endDetail: '',
    displayTime: '08:00',
    displayDate: '',
    carType: '7',
    price: 0,
    isActive: true,
    note: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load template data if editing
  useEffect(() => {
    if (template) {
      setFormData({
        region: template.region,
        startPoint: template.startPoint,
        endPoint: template.endPoint,
        startArea: template.startArea || '',
        endArea: template.endArea || '',
        startDetail: template.startDetail || '',
        endDetail: template.endDetail || '',
        displayTime: template.displayTime,
        displayDate: template.displayDate || '',
        carType: template.carType,
        price: template.price,
        isActive: template.isActive,
        note: template.note || ''
      });
    }
  }, [template]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.startPoint || formData.startPoint.length < 2) {
      newErrors.startPoint = 'Pickup point must be at least 2 characters';
    }

    if (!formData.endPoint || formData.endPoint.length < 2) {
      newErrors.endPoint = 'Destination must be at least 2 characters';
    }

    if (!formData.displayTime || !/^\d{2}:\d{2}$/.test(formData.displayTime)) {
      newErrors.displayTime = 'Invalid display time (HH:MM)';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <motion.div 
      className="fake-notification-form"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3>{template ? '✏️ Edit Notification' : '➕ Create New Notification'}</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Region *</label>
            <select
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value)}
              required
            >
              <option value="north">Northeast & Midwest</option>
              <option value="central">South</option>
              <option value="south">West</option>
            </select>
          </div>

          <div className="form-group">
            <label>Car Type *</label>
            <select
              value={formData.carType}
              onChange={(e) => handleChange('carType', e.target.value)}
              required
            >
              <option value="4">4 seats</option>
              <option value="7">7 seats</option>
              <option value="16">16 seats</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Pickup Point *</label>
            <select
              value={formData.startPoint}
              onChange={(e) => handleChange('startPoint', e.target.value)}
              disabled={!formData.region}
              required
            >
              <option value="">-- Select pickup point --</option>
              {formData.region && provincesByRegion[formData.region]?.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.startPoint && <span className="error-text">{errors.startPoint}</span>}
          </div>

          <div className="form-group">
            <label>Destination *</label>
            <select
              value={formData.endPoint}
              onChange={(e) => handleChange('endPoint', e.target.value)}
              disabled={!formData.region}
              required
            >
              <option value="">-- Select destination --</option>
              {formData.region && provincesByRegion[formData.region]?.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.endPoint && <span className="error-text">{errors.endPoint}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Pickup detail name (optional)</label>
            <input
              type="text"
              value={formData.startDetail}
              onChange={(e) => handleChange('startDetail', e.target.value)}
              placeholder="e.g. Downtown Springfield (Illinois)"
            />
          </div>

          <div className="form-group">
            <label>Destination detail name (optional)</label>
            <input
              type="text"
              value={formData.endDetail}
              onChange={(e) => handleChange('endDetail', e.target.value)}
              placeholder="e.g. Lake Tahoe resort town (California)"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Pickup area (optional)</label>
            <input
              type="text"
              value={formData.startArea}
              onChange={(e) => handleChange('startArea', e.target.value)}
              placeholder="e.g. Downtown Springfield, Illinois"
            />
          </div>

          <div className="form-group">
            <label>Destination area (optional)</label>
            <input
              type="text"
              value={formData.endArea}
              onChange={(e) => handleChange('endArea', e.target.value)}
              placeholder="e.g. Lake Tahoe, California"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Display Time *</label>
            <input
              type="time"
              value={formData.displayTime}
              onChange={(e) => handleChange('displayTime', e.target.value)}
              required
            />
            {errors.displayTime && <span className="error-text">{errors.displayTime}</span>}
          </div>

          <div className="form-group">
            <label>Display Date (optional)</label>
            <input
              type="date"
              value={formData.displayDate}
              onChange={(e) => handleChange('displayDate', e.target.value)}
            />
            <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>Leave blank if you don't want to show a date</span>
          </div>

          <div className="form-group">
            <label>Price (USD) *</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handleChange('price', parseInt(e.target.value) || 0)}
              placeholder="e.g. 120"
              min="0"
              required
            />
            {errors.price && <span className="error-text">{errors.price}</span>}
          </div>
        </div>

        <div className="form-group">
          <label>📝 Note (optional)</label>
          <textarea
            value={formData.note}
            onChange={(e) => handleChange('note', e.target.value)}
            placeholder="Enter a note shown to the driver (e.g. Call (555) 123-4567, pick up at the main gate...)"
            rows={3}
            style={{ resize: 'vertical', minHeight: '80px' }}
          />
        </div>

        <div className="form-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
            />
            <span>Enable notification immediately</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit">
            {template ? 'Update' : 'Create'}
          </button>
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default FakeNotificationForm;
