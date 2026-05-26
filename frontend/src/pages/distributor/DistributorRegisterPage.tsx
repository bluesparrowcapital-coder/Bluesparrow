import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User, Phone, Lock, Mail, BadgeCheck, Briefcase, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ARN_PREFIX = 'ARN-';

function normalizeArnInput(value: string) {
  return value.toUpperCase().replace(/^ARN-/i, '').replace(/[^A-Z0-9]/g, '');
}

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

function Field({
  icon: Icon, label, children,
}: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon className="w-4 h-4" />
        </span>
        {children}
      </div>
    </div>
  );
}

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
        arnNumber:  `${ARN_PREFIX}${normalizeArnInput(form.arnNumber.trim())}`,
        firmName:   form.firmName.trim(),
        euinNumber: form.euinNumber.trim(),
      });
      toast.success('Account created! Please login.');
      navigate('/auth/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30 focus:border-sparrow-blue transition';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sparrow-blue to-sparrow-teal rounded-2xl shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Distributor Registration</h1>
          <p className="text-sm text-gray-500 mt-1">SEBI-registered MFDs &amp; ARN holders only</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Section 1 — Personal Info */}
          <div className="px-6 pt-6 pb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-sparrow-blue mb-4">
              Personal Information
            </p>
            <div className="space-y-4">

              <Field icon={User} label="Full Name">
                <input className={inputCls} placeholder="As per AMFI records"
                  value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field icon={Phone} label="Mobile Number">
                  <input className={inputCls} placeholder="+91XXXXXXXXXX"
                    value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
                </Field>
                <Field icon={Lock} label="PIN (4–6 digits)">
                  <input className={inputCls} type="password" inputMode="numeric" maxLength={6}
                    placeholder="••••••" value={form.pin}
                    onChange={(e) => update('pin', e.target.value)} required />
                </Field>
              </div>

              <Field icon={Mail} label="Email Address">
                <input className={inputCls} type="email" placeholder="you@example.com"
                  value={form.email} onChange={(e) => update('email', e.target.value)} required />
              </Field>

            </div>
          </div>

          {/* Divider */}
          <div className="mx-6 border-t border-dashed border-gray-100" />

          {/* Section 2 — ARN Details */}
          <div className="px-6 pt-4 pb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-sparrow-teal mb-4">
              ARN / Regulatory Details
            </p>
            <div className="space-y-4">

              <Field icon={BadgeCheck} label="ARN Number">
                <div className="relative">
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 pointer-events-none">
                    {ARN_PREFIX}
                  </span>
                  <input className="w-full pl-20 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30 focus:border-sparrow-blue transition" placeholder="252837"
                    value={form.arnNumber} onChange={(e) => update('arnNumber', normalizeArnInput(e.target.value))} required />
                </div>
              </Field>

              <Field icon={Briefcase} label="Firm / Business Name">
                <input className={inputCls} placeholder="Your registered firm name"
                  value={form.firmName} onChange={(e) => update('firmName', e.target.value)} required />
              </Field>

              <Field icon={CreditCard} label="EUIN Number">
                <input className={inputCls} placeholder="E-XXXXXX"
                  value={form.euinNumber} onChange={(e) => update('euinNumber', e.target.value)} required />
              </Field>

            </div>
          </div>

          {/* Submit */}
          <div className="px-6 pb-6">
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sparrow-blue to-sparrow-teal text-white font-semibold text-sm shadow-md hover:opacity-90 active:scale-[.98] transition flex items-center justify-center gap-2 disabled:opacity-60">
              {loading
                ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                : <>
                    <Building2 className="w-4 h-4" />
                    Create Distributor Account
                  </>
              }
            </button>
          </div>

        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link to="/distributor/login" className="text-sparrow-blue font-semibold hover:underline">Login</Link>
        </p>

      </div>
    </div>
  );
}
