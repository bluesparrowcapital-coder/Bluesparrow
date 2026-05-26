import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, UserPlus, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { distributorService, CreatedDistributorClient } from '../../services/distributorService';

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  panNumber: string;
};

const INIT: FormState = {
  fullName: '',
  email: '',
  phone: '',
  panNumber: '',
};

export default function AddClientPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INIT);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedDistributorClient | null>(null);

  const tempPasswordPreview = useMemo(() => {
    if (form.phone.length !== 10 || form.panNumber.length !== 10) return 'MobileNumber + PAN';
    return `${form.phone}${form.panNumber}`;
  }, [form.phone, form.panNumber]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await distributorService.createClient(form);
      setCreated(result);
      toast.success('Client created successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Could not create client');
    } finally {
      setLoading(false);
    }
  }

  async function copyTempPassword() {
    if (!created) return;
    await navigator.clipboard.writeText(created.tempPassword);
    toast.success('Temporary password copied');
  }

  if (created) {
    return (
      <div className="space-y-5">
        <button onClick={() => navigate('/distributor/clients')} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to clients
        </button>

        <div className="card border-green-100 bg-green-50">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-green-500 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Client Onboarded</h1>
              <p className="text-sm text-gray-600 mt-1">Share these login details with the client. They can sign in from the investor login page and continue the NSE MF onboarding journey.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Client</p>
            <p className="text-lg font-bold text-gray-900 mt-2">{created.user.fullName}</p>
            <p className="text-sm text-gray-600 mt-1">Mobile: {created.user.phone}</p>
            <p className="text-sm text-gray-600">PAN: {created.user.panNumber}</p>
            <p className="text-sm text-gray-600">Email: {created.user.email}</p>
          </div>

          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Default Password</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 font-mono text-sm text-gray-900 break-all">
                {created.tempPassword}
              </div>
              <button onClick={copyTempPassword} className="px-3 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Formula: mobile number + PAN in uppercase.</p>
          </div>
        </div>

        <div className="card bg-blue-50 border-blue-100 text-sm text-blue-800">
          Client login flow: investor login page → mobile number enter kare → temporary password dale → onboarding profile, KYC, bank, nominee aur NSE MF registration complete kare.
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/distributor/clients')} className="btn-primary">Go to Client List</button>
          <button
            onClick={() => {
              setCreated(null);
              setForm(INIT);
            }}
            className="btn-secondary"
          >
            Add Another Client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <button onClick={() => navigate('/distributor/clients')} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to clients
      </button>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Add Client</h1>
        <p className="text-sm text-gray-500 mt-1">Create client login and hand over the default password so they can complete the NSE MF onboarding flow.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
            <input className="input w-full" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Client full name" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
            <input className="input w-full" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="client@example.com" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mobile Number</label>
            <input className="input w-full" value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" maxLength={10} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">PAN Number</label>
            <input className="input w-full uppercase" value={form.panNumber} onChange={(e) => update('panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} placeholder="ABCDE1234F" maxLength={10} required />
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-sparrow-blue/30 bg-blue-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-sparrow-blue">Default Password Preview</p>
          <p className="mt-1 text-sm font-mono text-gray-900 break-all">{tempPasswordPreview}</p>
          <p className="mt-1 text-xs text-gray-500">Client will use mobile number on login screen and this password for first sign-in.</p>
        </div>

        <button type="submit" disabled={loading} className="btn-primary inline-flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" />
          {loading ? 'Creating Client...' : 'Create Client Login'}
        </button>
      </form>
    </div>
  );
}