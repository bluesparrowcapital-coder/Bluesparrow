import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, UserPlus, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { distributorService, CreatedDistributorClient, DistributorUccPayload } from '../../services/distributorService';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
];
const RELATIONSHIPS = ['SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'OTHER'] as const;
const OCCUPATIONS = ['BUSINESS', 'SERVICE', 'PROFESSIONAL', 'AGRICULTURIST', 'RETIRED', 'HOUSEWIFE', 'STUDENT', 'OTHER'] as const;
const TAX_STATUS = ['INDIVIDUAL', 'NRI', 'PIO', 'HUF', 'COMPANY', 'PARTNERSHIP'] as const;
const INCOMES = ['BELOW_1L', '1L_TO_5L', '5L_TO_10L', '10L_TO_25L', '25L_TO_50L', '50L_TO_1CR', 'ABOVE_1CR'] as const;

const INIT: DistributorUccPayload = {
  fullName: '',
  email: '',
  phone: '',
  panNumber: '',
  profile: {
    fullNameAsPan: '',
    dob: '',
    gender: 'M',
    fatherOrSpouseName: '',
    motherName: '',
    placeOfBirth: '',
    maritalStatus: 'SINGLE',
    holdingType: 'SINGLE',
    occupation: 'SERVICE',
    taxStatus: 'INDIVIDUAL',
    annualIncome: 'BELOW_1L',
    isPep: false,
    isRelatedToPep: false,
  },
  address: {
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    state: 'Maharashtra',
    pincode: '',
    country: 'India',
  },
  bank: {
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    accountHolder: '',
    accountType: 'SB',
  },
  nominees: [
    {
      fullName: '',
      relationship: 'SPOUSE',
      percentage: 100,
      dob: '',
      guardianName: '',
      guardianRel: '',
      docType: 'PAN',
      docNumber: '',
      email: '',
      phone: '',
    },
  ],
};

export default function AddClientPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<DistributorUccPayload>(INIT);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedDistributorClient | null>(null);

  function setRoot<K extends keyof DistributorUccPayload>(key: K, value: DistributorUccPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setProfile<K extends keyof DistributorUccPayload['profile']>(key: K, value: DistributorUccPayload['profile'][K]) {
    setForm((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  }

  function setAddress<K extends keyof DistributorUccPayload['address']>(key: K, value: DistributorUccPayload['address'][K]) {
    setForm((current) => ({ ...current, address: { ...current.address, [key]: value } }));
  }

  function setBank<K extends keyof DistributorUccPayload['bank']>(key: K, value: DistributorUccPayload['bank'][K]) {
    setForm((current) => ({ ...current, bank: { ...current.bank, [key]: value } }));
  }

  function setNomineeField(field: keyof DistributorUccPayload['nominees'][number], value: string | number) {
    setForm((current) => ({ ...current, nominees: [{ ...current.nominees[0], [field]: value }] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: DistributorUccPayload = {
        ...form,
        panNumber: form.panNumber.toUpperCase(),
        profile: {
          ...form.profile,
          fullNameAsPan: form.profile.fullNameAsPan.toUpperCase(),
        },
        bank: {
          ...form.bank,
          ifscCode: form.bank.ifscCode.toUpperCase(),
        },
      };
      const result = await distributorService.createClient(payload);
      setCreated(result);
      toast.success('NSE UCC client created successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Could not create NSE UCC account');
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
              <p className="text-sm text-gray-600 mt-1">Full UCC data has been saved. Share these login details with the client for future access.</p>
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

        {created.nseResult && (
          <div className="card bg-blue-50 border-blue-100 text-sm text-blue-800 space-y-1">
            <p><strong>NSE Status:</strong> {created.nseResult.status ?? 'PENDING'}</p>
            {created.nseResult.message && <p>{created.nseResult.message}</p>}
            {created.nseResult.clientCode && <p><strong>Client Code:</strong> {created.nseResult.clientCode}</p>}
            {created.nseResult.ekycLink && <p className="break-all"><strong>eKYC Link:</strong> {created.nseResult.ekycLink}</p>}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => navigate('/distributor/clients')} className="btn-primary">Go to Client List</button>
          <button
            onClick={() => {
              setCreated(null);
              setForm(INIT);
            }}
            className="btn-secondary"
          >
            Create Another UCC
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <button onClick={() => navigate('/distributor/clients')} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to clients
      </button>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Create NSE UCC Account</h1>
        <p className="text-sm text-gray-500 mt-1">Fill the full client profile, address, bank and nominee details required for NSE MF onboarding.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="card space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-sparrow-blue">Basic Details</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full Name"><input className="input w-full" value={form.fullName} onChange={(e) => setRoot('fullName', e.target.value)} required /></Field>
            <Field label="Email"><input className="input w-full" type="email" value={form.email} onChange={(e) => setRoot('email', e.target.value)} required /></Field>
            <Field label="Mobile Number"><input className="input w-full" value={form.phone} onChange={(e) => setRoot('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} required /></Field>
            <Field label="PAN Number"><input className="input w-full uppercase" value={form.panNumber} onChange={(e) => setRoot('panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} maxLength={10} required /></Field>
          </div>
        </section>

        <section className="card space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-sparrow-blue">Profile</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full Name As PAN"><input className="input w-full uppercase" value={form.profile.fullNameAsPan} onChange={(e) => setProfile('fullNameAsPan', e.target.value.toUpperCase())} required /></Field>
            <Field label="Date Of Birth"><input className="input w-full" type="date" value={form.profile.dob} onChange={(e) => setProfile('dob', e.target.value)} required /></Field>
            <Field label="Gender"><select className="input w-full" value={form.profile.gender} onChange={(e) => setProfile('gender', e.target.value as 'M' | 'F' | 'T')}><option value="M">Male</option><option value="F">Female</option><option value="T">Other</option></select></Field>
            <Field label="Father / Spouse Name"><input className="input w-full" value={form.profile.fatherOrSpouseName} onChange={(e) => setProfile('fatherOrSpouseName', e.target.value)} required /></Field>
            <Field label="Mother Name"><input className="input w-full" value={form.profile.motherName || ''} onChange={(e) => setProfile('motherName', e.target.value)} /></Field>
            <Field label="Place Of Birth"><input className="input w-full" value={form.profile.placeOfBirth || ''} onChange={(e) => setProfile('placeOfBirth', e.target.value)} /></Field>
            <Field label="Occupation"><select className="input w-full" value={form.profile.occupation} onChange={(e) => setProfile('occupation', e.target.value as DistributorUccPayload['profile']['occupation'])}>{OCCUPATIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="Tax Status"><select className="input w-full" value={form.profile.taxStatus} onChange={(e) => setProfile('taxStatus', e.target.value as DistributorUccPayload['profile']['taxStatus'])}>{TAX_STATUS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="Annual Income"><select className="input w-full" value={form.profile.annualIncome} onChange={(e) => setProfile('annualIncome', e.target.value as DistributorUccPayload['profile']['annualIncome'])}>{INCOMES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="Marital Status"><select className="input w-full" value={form.profile.maritalStatus} onChange={(e) => setProfile('maritalStatus', e.target.value as DistributorUccPayload['profile']['maritalStatus'])}><option value="SINGLE">SINGLE</option><option value="MARRIED">MARRIED</option><option value="WIDOWED">WIDOWED</option><option value="DIVORCED">DIVORCED</option></select></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(form.profile.isPep)} onChange={(e) => setProfile('isPep', e.target.checked)} /> Politically Exposed Person</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(form.profile.isRelatedToPep)} onChange={(e) => setProfile('isRelatedToPep', e.target.checked)} /> Related To PEP</label>
          </div>
        </section>

        <section className="card space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-sparrow-blue">Address</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Address Line 1"><input className="input w-full" value={form.address.addressLine1} onChange={(e) => setAddress('addressLine1', e.target.value)} required /></Field>
            <Field label="Address Line 2"><input className="input w-full" value={form.address.addressLine2 || ''} onChange={(e) => setAddress('addressLine2', e.target.value)} /></Field>
            <Field label="City"><input className="input w-full" value={form.address.city} onChange={(e) => setAddress('city', e.target.value)} required /></Field>
            <Field label="District"><input className="input w-full" value={form.address.district || ''} onChange={(e) => setAddress('district', e.target.value)} /></Field>
            <Field label="State"><select className="input w-full" value={form.address.state} onChange={(e) => setAddress('state', e.target.value)}>{STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></Field>
            <Field label="Pincode"><input className="input w-full" value={form.address.pincode} onChange={(e) => setAddress('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} required /></Field>
          </div>
        </section>

        <section className="card space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-sparrow-blue">Bank</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Account Number"><input className="input w-full" value={form.bank.accountNumber} onChange={(e) => setBank('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))} required /></Field>
            <Field label="IFSC Code"><input className="input w-full uppercase" value={form.bank.ifscCode} onChange={(e) => setBank('ifscCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} required /></Field>
            <Field label="Bank Name"><input className="input w-full" value={form.bank.bankName} onChange={(e) => setBank('bankName', e.target.value)} required /></Field>
            <Field label="Account Holder"><input className="input w-full" value={form.bank.accountHolder} onChange={(e) => setBank('accountHolder', e.target.value)} required /></Field>
          </div>
        </section>

        <section className="card space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-sparrow-blue">Nominee</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nominee Name"><input className="input w-full" value={form.nominees[0].fullName} onChange={(e) => setNomineeField('fullName', e.target.value)} required /></Field>
            <Field label="Relationship"><select className="input w-full" value={form.nominees[0].relationship} onChange={(e) => setNomineeField('relationship', e.target.value)}>{RELATIONSHIPS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="Nominee DOB"><input className="input w-full" type="date" value={form.nominees[0].dob || ''} onChange={(e) => setNomineeField('dob', e.target.value)} /></Field>
            <Field label="Document Number"><input className="input w-full uppercase" value={form.nominees[0].docNumber || ''} onChange={(e) => setNomineeField('docNumber', e.target.value.toUpperCase())} /></Field>
          </div>
        </section>

        <button type="submit" disabled={loading} className="btn-primary inline-flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" />
          {loading ? 'Creating NSE UCC...' : 'Create NSE UCC Account'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}