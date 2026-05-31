import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Building2, BadgeCheck, Lock, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { setTokens, setUser } from '../../store/slices/authSlice';
import api from '../../services/api';

const ARN_PREFIX = 'ARN-';

function normalizeArnInput(value: string) {
  return value.toUpperCase().replace(/^ARN-/i, '').replace(/[^A-Z0-9]/g, '');
}

function isPhoneInput(value: string) {
  return /^\d{10}$/.test(value.replace(/\D/g, '').slice(-10)) && value.replace(/\D/g, '').length >= 10;
}

export default function DistributorLoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [identifier, setIdentifier] = useState('');  // ARN suffix or phone
  const [usePhone,   setUsePhone]   = useState(false);
  const [pin,        setPin]        = useState('');
  const [loading,    setLoading]    = useState(false);
  const [locked,     setLocked]     = useState(false);

  function handleIdentifierChange(raw: string) {
    if (usePhone) {
      // Phone mode: digits only, max 10
      setIdentifier(raw.replace(/\D/g, '').slice(0, 10));
    } else {
      setIdentifier(normalizeArnInput(raw));
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return toast.error(usePhone ? 'Enter your mobile number' : 'Enter your ARN number');
    if (pin.length < 4)     return toast.error('PIN must be at least 4 digits');

    // Build the arnNumber field: phone digits are passed as-is (backend now
    // accepts phone as fallback identifier), ARN gets the prefix prepended.
    const arnPayload = usePhone
      ? identifier.replace(/\D/g, '')
      : `${ARN_PREFIX}${normalizeArnInput(identifier.trim())}`;

    setLoading(true);
    try {
      const res = await api.post('/distributor/login', { arnNumber: arnPayload, pin });
      const d = res.data.data; // { user, accessToken, refreshToken }
      dispatch(setTokens({ accessToken: d.accessToken, refreshToken: d.refreshToken }));
      dispatch(setUser({
        userId:   d.user.id,
        phone:    d.user.phone,
        email:    d.user.email,
        fullName: d.user.fullName,
        role:     d.user.role,
      }));
      toast.success(`Welcome back, ${d.user.fullName}!`);
      navigate('/distributor/dashboard');
    } catch (err: any) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message ?? 'Login failed. Check your credentials or try again.';
      if (status === 423) {
        setLocked(true);
        toast.error('Account locked for 30 minutes due to wrong PINs.');
      } else {
        toast.error(msg);
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30 focus:border-sparrow-blue transition';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sparrow-blue to-sparrow-teal rounded-2xl shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Distributor Login</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in with your ARN number &amp; PIN</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">

          {/* Toggle: ARN vs Phone */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setUsePhone(false); setIdentifier(''); }}
              className={`flex-1 py-2 transition ${!usePhone ? 'bg-sparrow-blue text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              ARN Number
            </button>
            <button
              type="button"
              onClick={() => { setUsePhone(true); setIdentifier(''); }}
              className={`flex-1 py-2 transition ${usePhone ? 'bg-sparrow-blue text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Mobile Number
            </button>
          </div>

          {/* ARN / Phone field */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {usePhone ? 'Mobile Number' : 'ARN Number'}
            </label>
            {usePhone ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  className={inputCls}
                  type="tel"
                  inputMode="numeric"
                  placeholder="9580118412"
                  maxLength={10}
                  value={identifier}
                  onChange={(e) => handleIdentifierChange(e.target.value)}
                  autoComplete="tel"
                  required
                />
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <BadgeCheck className="w-4 h-4" />
                </span>
                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 pointer-events-none">
                  {ARN_PREFIX}
                </span>
                <input
                  className="w-full pl-20 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30 focus:border-sparrow-blue transition"
                  placeholder="252837"
                  value={identifier}
                  onChange={(e) => handleIdentifierChange(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            )}
          </div>

          {/* PIN */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              PIN (4–6 digits)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                className={inputCls}
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                autoComplete="current-password"
                disabled={locked}
                required
              />
            </div>
            {locked && (
              <p className="text-red-500 text-xs mt-1">
                Too many wrong attempts. Account locked for 30 minutes.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || locked}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sparrow-blue to-sparrow-teal text-white font-semibold text-sm shadow-md hover:opacity-90 active:scale-[.98] transition flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
          >
            {loading
              ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              : <>
                  <Building2 className="w-4 h-4" />
                  Login to Distributor Panel
                </>
            }
          </button>

        </form>

        <div className="text-center mt-5 space-y-2">
          <p className="text-sm text-gray-500">
            New distributor?{' '}
            <Link to="/distributor/register" className="text-sparrow-blue font-semibold hover:underline">
              Register here
            </Link>
          </p>
          <p className="text-xs text-gray-400">
            Investor login?{' '}
            <Link to="/auth/login" className="text-gray-500 font-medium hover:underline">
              Click here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
