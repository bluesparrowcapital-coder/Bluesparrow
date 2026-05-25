import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  pin: string;
  arnNumber: string;
  firmName: string;
  euinNumber: string;
}

const INIT: FormState = {
  fullName: '', email: '', phone: '', pin: '',
  arnNumber: '', firmName: '', euinNumber: '',
};

export default function DistributorRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]       = useState<FormState>(INIT);
  const [loading, setLoading] = useState(false);

  function update(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.pin.length < 4 || form.pin.length > 6 || !/^\d+$/.test(form.pin)) {
      toast.error('PIN must be 4-6 digits');
      return;
    }
    setLoading(true);
    try {
      await api.post('/distributor/register', {
        fullName:   form.fullName.trim(),
        email:      form.email.trim().toLowerCase(),
        phone:      form.phone.trim(),
        pin:        form.pin,
        arnNumber:  form.arnNumber.trim().toUpperCase(),
        firmName:   form.firmName.trim(),
        euinNumber: form.euinNumber.trim() || undefined,
      });
      toast.success('Account created! Please login.');
      navigate('/auth/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sparrow-blue rounded-2xl mb-4">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Distributor Registration</h1>
          <p className="text-sm text-gray-500 mt-1">SEBI-registered MFDs / ARN holders only</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {/* Personal */}
          <div>
            <label className="label">Full Name</label>
            <input className="input" placeholder="As per AMFI records" value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mobile Number</label>
              <input className="input" placeholder="+91XXXXXXXXXX" value={form.phone}
                onChange={(e) => update('phone', e.target.value)} required />
            </div>
            <div>
              <label className="label">PIN (4-6 digits)</label>
              <input className="input" type="password" inputMode="numeric" maxLength={6}
                placeholder="••••••" value={form.pin}
                onChange={(e) => update('pin', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Email Address</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email}
              onChange={(e) => update('email', e.target.value)} required />
          </div>

          <hr className="border-gray-100" />

          {/* ARN details */}
          <div>
            <label className="label">ARN Number</label>
            <input className="input" placeholder="ARN-XXXXXX" value={form.arnNumber}
              onChange={(e) => update('arnNumber', e.target.value)} required />
          </div>
          <div>
            <label className="label">Firm / Business Name</label>
            <input className="input" placeholder="Your firm name" value={form.firmName}
              onChange={(e) => update('firmName', e.target.value)} required />
          </div>
          <div>
            <label className="label">EUIN Number <span className="text-gray-400">(optional)</span></label>
            <input className="input" placeholder="E-XXXXXX" value={form.euinNumber}
              onChange={(e) => update('euinNumber', e.target.value)} />
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
            {loading
              ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              : 'Create Distributor Account'
            }
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-sparrow-blue font-medium">Login</Link>
        </p>
      </div>
    </div>
  );
}
