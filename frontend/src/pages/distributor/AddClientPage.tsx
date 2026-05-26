import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, MapPinned, ShieldCheck, UploadCloud, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { distributorService, CreatedDistributorClient, DistributorClientDocuments, DistributorUccPayload } from '../../services/distributorService';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
];
const RELATIONSHIPS = ['SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'OTHER'] as const;
const OCCUPATIONS = ['BUSINESS', 'SERVICE', 'PROFESSIONAL', 'AGRICULTURIST', 'RETIRED', 'HOUSEWIFE', 'STUDENT', 'OTHER'] as const;
const TAX_STATUS = ['INDIVIDUAL', 'NRI', 'PIO', 'HUF', 'COMPANY', 'PARTNERSHIP'] as const;
const INCOMES = ['BELOW_1L', '1L_TO_5L', '5L_TO_10L', '10L_TO_25L', '25L_TO_50L', '50L_TO_1CR', 'ABOVE_1CR'] as const;
const DECLARATIONS = ['SELF', 'FAMILY', 'OTHER'] as const;
const SOURCES_OF_WEALTH = ['SALARY', 'BUSINESS_INCOME', 'PROFESSIONAL_INCOME', 'AGRICULTURE', 'INHERITANCE', 'SAVINGS', 'OTHER'] as const;
const VERIFICATION_SOURCES = ['MANUAL', 'CALL', 'BRANCH_VISIT', 'DIGILOCKER', 'NSEMF'] as const;
const ACCOUNT_TYPES = ['SB', 'CA', 'NRE', 'NRO'] as const;
const DOCUMENT_FIELDS: Array<{ key: keyof DistributorClientDocuments; label: string; accept?: string; hint: string }> = [
  { key: 'panDocument', label: 'PAN Card', accept: '.pdf,image/*', hint: 'Upload PAN copy' },
  { key: 'aadhaarDocument', label: 'Aadhaar Card', accept: '.pdf,image/*', hint: 'Front or merged Aadhaar copy' },
  { key: 'photoDocument', label: 'Client Photo', accept: 'image/*', hint: 'Passport-size photo' },
  { key: 'signatureDocument', label: 'Signature', accept: 'image/*', hint: 'Signed white-sheet image' },
  { key: 'bankProofDocument', label: 'Bank Proof', accept: '.pdf,image/*', hint: 'Cancelled cheque or bank statement' },
];

const INIT: DistributorUccPayload = {
  fullName: '',
  email: '',
  phone: '',
  panNumber: '',
  mobileDeclaration: 'SELF',
  mailDeclaration: 'SELF',
  profile: {
    fullNameAsPan: '',
    dob: '',
    gender: 'M',
    pepCategory: 'NOT_EXPOSED',
    countryOfBirth: 'India',
    cityOfBirth: '',
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
    addressLine3: '',
    city: '',
    district: '',
    state: 'Maharashtra',
    pincode: '',
    country: 'India',
    sourceOfWealth: 'SALARY',
  },
  banks: [
    {
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      accountHolder: '',
      accountType: 'SB',
      isDefault: true,
    },
  ],
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
  verification: {
    source: 'MANUAL',
    sourceDetails: '',
    termsAccepted: false,
  },
};

const EMPTY_DOCUMENTS: DistributorClientDocuments = {
  panDocument: null,
  aadhaarDocument: null,
  photoDocument: null,
  signatureDocument: null,
  bankProofDocument: null,
};

function emptyBank() {
  return {
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    accountHolder: '',
    accountType: 'SB' as const,
    isDefault: false,
  };
}

export default function AddClientPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<DistributorUccPayload>(INIT);
  const [documents, setDocuments] = useState<DistributorClientDocuments>(EMPTY_DOCUMENTS);
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

  function setVerification<K extends keyof NonNullable<DistributorUccPayload['verification']>>(key: K, value: NonNullable<DistributorUccPayload['verification']>[K]) {
    setForm((current) => ({
      ...current,
      verification: { ...(current.verification ?? {}), [key]: value },
    }));
  }

  function setBank(index: number, key: keyof DistributorUccPayload['banks'][number], value: string | boolean) {
    setForm((current) => ({
      ...current,
      banks: current.banks.map((bank, bankIndex) => {
        if (bankIndex !== index) {
          if (key === 'isDefault' && value === true) return { ...bank, isDefault: false };
          return bank;
        }
        return { ...bank, [key]: value };
      }),
    }));
  }

  function addBank() {
    setForm((current) => ({ ...current, banks: [...current.banks, emptyBank()] }));
  }

  function removeBank(index: number) {
    setForm((current) => {
      const next = current.banks.filter((_, bankIndex) => bankIndex !== index);
      if (next.length && !next.some((bank) => bank.isDefault)) next[0].isDefault = true;
      return { ...current, banks: next.length ? next : [emptyBank()] };
    });
  }

  function setNomineeField(field: keyof DistributorUccPayload['nominees'][number], value: string | number) {
    setForm((current) => ({ ...current, nominees: [{ ...current.nominees[0], [field]: value }] }));
  }

  function setDocument(field: keyof DistributorClientDocuments, file: File | null) {
    setDocuments((current) => ({ ...current, [field]: file }));
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
          placeOfBirth: form.profile.cityOfBirth,
          isPep: form.profile.pepCategory === 'PEP',
          isRelatedToPep: form.profile.pepCategory === 'RELATED_PEP',
        },
        banks: form.banks.map((bank, index) => ({
          ...bank,
          ifscCode: bank.ifscCode.toUpperCase(),
          isDefault: bank.isDefault ?? index === 0,
        })),
      };
      const result = await distributorService.createClient(payload, documents);
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
              setDocuments(EMPTY_DOCUMENTS);
            }}
            className="btn-secondary"
          >
            Create Another UCC
          </button>
        </div>
      </div>
    );
  }

  const uploadedDocumentCount = Object.values(documents).filter(Boolean).length;

  return (
    <div className="space-y-0 w-full pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <button onClick={() => navigate('/distributor/clients')} className="text-orange-500 hover:underline font-medium">Clients</button>
        <span className="text-gray-400">›</span>
        <span className="text-gray-700 font-semibold">Create Client</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* ── KYC Information ── */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <SectionHeader icon="📋" title="KYC Information" />
          <div className="mt-6 grid gap-x-6 gap-y-5 grid-cols-3">
            <Field label="Tax Status" required>
              <select className="input w-full" value={form.profile.taxStatus} onChange={(e) => setProfile('taxStatus', e.target.value as DistributorUccPayload['profile']['taxStatus'])}>
                {TAX_STATUS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="PAN" required>
              <input className="input w-full" placeholder="Enter PAN Number" value={form.panNumber} onChange={(e) => setRoot('panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} maxLength={10} required />
            </Field>
            <Field label="Full Name" required>
              <input className="input w-full" placeholder="Enter Full Name" value={form.fullName} onChange={(e) => setRoot('fullName', e.target.value)} required />
            </Field>
            <Field label="Date of Birth" required>
              <input className="input w-full" type="date" value={form.profile.dob} onChange={(e) => setProfile('dob', e.target.value)} required />
            </Field>
            <Field label="Mobile Number" required>
              <input className="input w-full" placeholder="Enter Mobile Number" value={form.phone} onChange={(e) => setRoot('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} required />
            </Field>
            <Field label="Email" required>
              <input className="input w-full" placeholder="Enter Email Address" type="email" value={form.email} onChange={(e) => setRoot('email', e.target.value)} required />
            </Field>
            <Field label="Mobile Declaration" required>
              <select className="input w-full" value={form.mobileDeclaration} onChange={(e) => setRoot('mobileDeclaration', e.target.value as DistributorUccPayload['mobileDeclaration'])}>
                {DECLARATIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Mail Declaration" required>
              <select className="input w-full" value={form.mailDeclaration} onChange={(e) => setRoot('mailDeclaration', e.target.value as DistributorUccPayload['mailDeclaration'])}>
                {DECLARATIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* ── Personal Details ── */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <SectionHeader icon="👤" title="Personal Details" />
          <div className="mt-6 space-y-5">
            <Field label="Gender" required>
              <div className="flex items-center gap-8 pt-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="gender" className="accent-orange-500" checked={form.profile.gender === 'M'} onChange={() => setProfile('gender', 'M')} /> Male
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="gender" className="accent-orange-500" checked={form.profile.gender === 'F'} onChange={() => setProfile('gender', 'F')} /> Female
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="gender" className="accent-orange-500" checked={form.profile.gender === 'T'} onChange={() => setProfile('gender', 'T')} /> Other
                </label>
              </div>
            </Field>
            <div className="grid gap-x-6 gap-y-5 grid-cols-3">
              <Field label="I Am" required>
                <select className="input w-full" value={form.profile.pepCategory} onChange={(e) => setProfile('pepCategory', e.target.value as DistributorUccPayload['profile']['pepCategory'])}>
                  <option value="NOT_EXPOSED">a politically not exposed person</option>
                  <option value="PEP">a politically exposed person</option>
                  <option value="RELATED_PEP">related to a politically exposed person</option>
                </select>
              </Field>
              <Field label="Country of Birth" required>
                <input className="input w-full" placeholder="Enter Country of Birth" value={form.profile.countryOfBirth || ''} onChange={(e) => setProfile('countryOfBirth', e.target.value)} />
              </Field>
              <Field label="City of Birth" required>
                <input className="input w-full" placeholder="Enter City of Birth" value={form.profile.cityOfBirth || ''} onChange={(e) => setProfile('cityOfBirth', e.target.value)} />
              </Field>
              <Field label="Full Name as PAN" required>
                <input className="input w-full uppercase" placeholder="Name exactly as on PAN" value={form.profile.fullNameAsPan} onChange={(e) => setProfile('fullNameAsPan', e.target.value.toUpperCase())} required />
              </Field>
              <Field label="Father / Spouse Name" required>
                <input className="input w-full" placeholder="Enter Father / Spouse Name" value={form.profile.fatherOrSpouseName} onChange={(e) => setProfile('fatherOrSpouseName', e.target.value)} required />
              </Field>
              <Field label="Mother Name">
                <input className="input w-full" placeholder="Enter Mother Name" value={form.profile.motherName || ''} onChange={(e) => setProfile('motherName', e.target.value)} />
              </Field>
              <Field label="Marital Status">
                <select className="input w-full" value={form.profile.maritalStatus} onChange={(e) => setProfile('maritalStatus', e.target.value as DistributorUccPayload['profile']['maritalStatus'])}>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="WIDOWED">Widowed</option>
                  <option value="DIVORCED">Divorced</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* ── Address ── */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <SectionHeader icon="📍" title="Address" />
          <div className="mt-6 grid gap-x-6 gap-y-5 grid-cols-3">
            <Field label="Address Line 1" required>
              <input className="input w-full" placeholder="Enter Address Line 1" value={form.address.addressLine1} onChange={(e) => setAddress('addressLine1', e.target.value)} required />
            </Field>
            <Field label="Address Line 2">
              <input className="input w-full" placeholder="Enter Address Line 2" value={form.address.addressLine2 || ''} onChange={(e) => setAddress('addressLine2', e.target.value)} />
            </Field>
            <Field label="Address Line 3">
              <input className="input w-full" placeholder="Enter Address Line 3" value={form.address.addressLine3 || ''} onChange={(e) => setAddress('addressLine3', e.target.value)} />
            </Field>
            <Field label="Pincode" required>
              <input className="input w-full" placeholder="Enter Pincode" value={form.address.pincode} onChange={(e) => setAddress('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} required />
            </Field>
            <Field label="State" required>
              <select className="input w-full" value={form.address.state} onChange={(e) => setAddress('state', e.target.value)}>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="City" required>
              <input className="input w-full" placeholder="Enter City" value={form.address.city} onChange={(e) => setAddress('city', e.target.value)} required />
            </Field>
            <Field label="Occupation" required>
              <select className="input w-full" value={form.profile.occupation} onChange={(e) => setProfile('occupation', e.target.value as DistributorUccPayload['profile']['occupation'])}>
                {OCCUPATIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Annual Income">
              <select className="input w-full" value={form.profile.annualIncome} onChange={(e) => setProfile('annualIncome', e.target.value as DistributorUccPayload['profile']['annualIncome'])}>
                {INCOMES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Source of Wealth">
              <select className="input w-full" value={form.address.sourceOfWealth} onChange={(e) => setAddress('sourceOfWealth', e.target.value)}>
                {SOURCES_OF_WEALTH.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* ── Bank Accounts ── */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <SectionHeader icon="🏦" title="Bank Accounts" />
          <div className="mt-6 space-y-6">
            {form.banks.map((bank, index) => (
              <div key={index} className="rounded-xl border border-gray-200 p-5 space-y-5 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="accent-orange-500" checked={Boolean(bank.isDefault)} onChange={(e) => setBank(index, 'isDefault', e.target.checked)} />
                    Mark as default
                  </label>
                  {form.banks.length > 1 && (
                    <button type="button" onClick={() => removeBank(index)} className="text-xs text-red-500 hover:underline">Remove</button>
                  )}
                </div>
                <div className="grid gap-x-6 gap-y-5 grid-cols-4">
                  <Field label="Account Type">
                    <select className="input w-full" value={bank.accountType} onChange={(e) => setBank(index, 'accountType', e.target.value)}>
                      {ACCOUNT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="IFSC Code" required>
                    <input className="input w-full uppercase" placeholder="Enter IFSC Code" value={bank.ifscCode} onChange={(e) => setBank(index, 'ifscCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} required />
                  </Field>
                  <Field label="Account Number" required>
                    <input className="input w-full" placeholder="Enter Account Number" value={bank.accountNumber} onChange={(e) => setBank(index, 'accountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))} required />
                  </Field>
                  <Field label="Bank Name" required>
                    <input className="input w-full" placeholder="Enter Bank Name" value={bank.bankName} onChange={(e) => setBank(index, 'bankName', e.target.value)} required />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-x-6">
                  <Field label="Account Holder Name" required>
                    <input className="input w-full" placeholder="Enter Account Holder Name" value={bank.accountHolder} onChange={(e) => setBank(index, 'accountHolder', e.target.value)} required />
                  </Field>
                </div>
              </div>
            ))}
            <button type="button" onClick={addBank} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-orange-300 text-orange-600 hover:bg-orange-50 text-sm font-medium transition">
              + Add Another Account
            </button>
          </div>
        </div>

        {/* ── Holding Type ── */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <SectionHeader icon="🤝" title="Holding Type" />
          <div className="mt-6 grid gap-x-6 gap-y-5 grid-cols-3">
            <Field label="Account Holding Type">
              <select className="input w-full" value={form.profile.holdingType} onChange={(e) => setProfile('holdingType', e.target.value as DistributorUccPayload['profile']['holdingType'])}>
                <option value="SINGLE">Single</option>
                <option value="JOINT">Joint</option>
                <option value="ANYONE_OR_SURVIVOR">Anyone or Survivor</option>
              </select>
            </Field>
          </div>
        </div>

        {/* ── Nominee ── */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <SectionHeader icon="👨‍👩‍👧" title="Nominee" />
          <div className="mt-6 grid gap-x-6 gap-y-5 grid-cols-3">
            <Field label="Nominee Name" required>
              <input className="input w-full" placeholder="Enter Nominee Name" value={form.nominees[0].fullName} onChange={(e) => setNomineeField('fullName', e.target.value)} required />
            </Field>
            <Field label="Relationship" required>
              <select className="input w-full" value={form.nominees[0].relationship} onChange={(e) => setNomineeField('relationship', e.target.value)}>
                {RELATIONSHIPS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Nominee Date of Birth">
              <input className="input w-full" type="date" value={form.nominees[0].dob || ''} onChange={(e) => setNomineeField('dob', e.target.value)} />
            </Field>
            <Field label="Document Number">
              <input className="input w-full uppercase" placeholder="Enter Document Number" value={form.nominees[0].docNumber || ''} onChange={(e) => setNomineeField('docNumber', e.target.value.toUpperCase())} />
            </Field>
            <Field label="Guardian Name">
              <input className="input w-full" placeholder="Enter Guardian Name" value={form.nominees[0].guardianName || ''} onChange={(e) => setNomineeField('guardianName', e.target.value)} />
            </Field>
            <Field label="Guardian Relation">
              <input className="input w-full" placeholder="Enter Guardian Relation" value={form.nominees[0].guardianRel || ''} onChange={(e) => setNomineeField('guardianRel', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* ── Documents ── */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <SectionHeader icon="📎" title="Documents" />
          <div className="mt-6 grid gap-5 grid-cols-3 xl:grid-cols-5">
            {DOCUMENT_FIELDS.map((document) => (
              <DocumentInputCard
                key={document.key}
                label={document.label}
                hint={document.hint}
                accept={document.accept}
                file={documents[document.key] ?? null}
                onChange={(file) => setDocument(document.key, file)}
              />
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500">Files are uploaded with the client creation request and stored against the investor KYC record. Max 5 MB per file.</p>
        </div>

        {/* ── Verification ── */}
        <div className="px-8 pt-8 pb-6">
          <SectionHeader icon="✅" title="Verification" />
          <div className="mt-6 grid gap-x-6 gap-y-5 grid-cols-3">
            <Field label="Verification Source">
              <select className="input w-full" value={form.verification?.source} onChange={(e) => setVerification('source', e.target.value)}>
                {VERIFICATION_SOURCES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Source Details">
              <input className="input w-full" placeholder="Enter Source Details" value={form.verification?.sourceDetails || ''} onChange={(e) => setVerification('sourceDetails', e.target.value)} />
            </Field>
          </div>
          <div className="mt-5 flex items-center gap-2">
            <input type="checkbox" id="terms" className="accent-orange-500 w-4 h-4" checked={Boolean(form.verification?.termsAccepted)} onChange={(e) => setVerification('termsAccepted', e.target.checked)} />
            <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">I have read and agree to the Terms &amp; Conditions</label>
          </div>
        </div>

        {/* ── Submit bar ── */}
        <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 px-8 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <MapPinned className="w-4 h-4 text-orange-500 shrink-0" />
            {uploadedDocumentCount} document{uploadedDocumentCount === 1 ? '' : 's'} attached &nbsp;·&nbsp; Default password: mobile + PAN
          </p>
          <button type="submit" disabled={loading} className="btn-primary inline-flex items-center justify-center gap-2 min-w-[220px]">
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating NSE UCC...' : 'Create NSE UCC Account'}
          </button>
        </div>

      </form>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-lg shrink-0">
        {icon}
      </div>
      <h2 className="text-base font-bold text-orange-500">{title}</h2>
      <div className="flex-1 h-px bg-gray-200 ml-2" />
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function DocumentInputCard({
  label,
  hint,
  accept,
  file,
  onChange,
}: {
  label: string;
  hint: string;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 hover:border-orange-400 hover:bg-orange-50 transition cursor-pointer min-h-[120px]">
      <UploadCloud className={`w-6 h-6 ${file ? 'text-orange-500' : 'text-gray-400'}`} />
      <p className="text-sm font-semibold text-gray-800 text-center">{label}</p>
      <p className="text-xs text-gray-500 text-center">{file ? file.name : hint}</p>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}