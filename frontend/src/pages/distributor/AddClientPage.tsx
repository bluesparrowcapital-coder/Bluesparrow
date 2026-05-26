import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, FileBadge2, Landmark, MapPinned, ShieldCheck, UploadCloud, UserPlus } from 'lucide-react';
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
    <div className="space-y-6 w-full max-w-[1380px] pb-8">
      <button onClick={() => navigate('/distributor/clients')} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to clients
      </button>

      <div className="rounded-[28px] border border-orange-100 bg-[linear-gradient(135deg,#fff6ed_0%,#ffffff_55%,#eef6ff_100%)] p-6 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">Distributor Desk</p>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">Create NSE UCC Account</h1>
            <p className="text-sm text-gray-600 mt-2">Structured client creation with KYC, contact declarations, bank setup, document uploads and verification in one screen.</p>
          </div>
          <div className="grid gap-3 grid-cols-3 xl:self-start">
            <HeroStat icon={<FileBadge2 className="w-4 h-4" />} label="Sections" value="8" />
            <HeroStat icon={<UploadCloud className="w-4 h-4" />} label="Docs Ready" value={String(uploadedDocumentCount)} />
            <HeroStat icon={<Landmark className="w-4 h-4" />} label="Banks" value={String(form.banks.length)} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-12 xl:items-start">
        <section className="card space-y-4 border border-gray-100 shadow-sm xl:col-span-8">
          <SectionTitle title="KYC Information" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Tax Status"><select className="input w-full" value={form.profile.taxStatus} onChange={(e) => setProfile('taxStatus', e.target.value as DistributorUccPayload['profile']['taxStatus'])}>{TAX_STATUS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="PAN"><input className="input w-full uppercase" value={form.panNumber} onChange={(e) => setRoot('panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} maxLength={10} required /></Field>
            <Field label="Full Name"><input className="input w-full" value={form.fullName} onChange={(e) => setRoot('fullName', e.target.value)} required /></Field>
            <Field label="Date Of Birth"><input className="input w-full" type="date" value={form.profile.dob} onChange={(e) => setProfile('dob', e.target.value)} required /></Field>
            <Field label="Mobile Number"><input className="input w-full" value={form.phone} onChange={(e) => setRoot('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} required /></Field>
            <Field label="Email"><input className="input w-full" type="email" value={form.email} onChange={(e) => setRoot('email', e.target.value)} required /></Field>
            <Field label="Mobile Declaration"><select className="input w-full" value={form.mobileDeclaration} onChange={(e) => setRoot('mobileDeclaration', e.target.value as DistributorUccPayload['mobileDeclaration'])}>{DECLARATIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="Mail Declaration"><select className="input w-full" value={form.mailDeclaration} onChange={(e) => setRoot('mailDeclaration', e.target.value as DistributorUccPayload['mailDeclaration'])}>{DECLARATIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
          </div>
        </section>

        <section className="card space-y-4 border border-gray-100 shadow-sm xl:col-span-4">
          <SectionTitle title="Personal Details" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Gender"><div className="flex flex-wrap gap-5 pt-2 text-sm text-gray-700"><label className="flex items-center gap-2"><input type="radio" checked={form.profile.gender === 'M'} onChange={() => setProfile('gender', 'M')} /> Male</label><label className="flex items-center gap-2"><input type="radio" checked={form.profile.gender === 'F'} onChange={() => setProfile('gender', 'F')} /> Female</label><label className="flex items-center gap-2"><input type="radio" checked={form.profile.gender === 'T'} onChange={() => setProfile('gender', 'T')} /> Other</label></div></Field>
            </div>
            <Field label="I Am"><select className="input w-full" value={form.profile.pepCategory} onChange={(e) => setProfile('pepCategory', e.target.value as DistributorUccPayload['profile']['pepCategory'])}><option value="NOT_EXPOSED">Politically not exposed person</option><option value="PEP">Politically exposed person</option><option value="RELATED_PEP">Related to politically exposed person</option></select></Field>
            <Field label="Country Of Birth"><input className="input w-full" value={form.profile.countryOfBirth || ''} onChange={(e) => setProfile('countryOfBirth', e.target.value)} /></Field>
            <Field label="City Of Birth"><input className="input w-full" value={form.profile.cityOfBirth || ''} onChange={(e) => setProfile('cityOfBirth', e.target.value)} /></Field>
            <Field label="Full Name As PAN"><input className="input w-full uppercase" value={form.profile.fullNameAsPan} onChange={(e) => setProfile('fullNameAsPan', e.target.value.toUpperCase())} required /></Field>
            <Field label="Father / Spouse Name"><input className="input w-full" value={form.profile.fatherOrSpouseName} onChange={(e) => setProfile('fatherOrSpouseName', e.target.value)} required /></Field>
            <Field label="Mother Name"><input className="input w-full" value={form.profile.motherName || ''} onChange={(e) => setProfile('motherName', e.target.value)} /></Field>
            <Field label="Marital Status"><select className="input w-full" value={form.profile.maritalStatus} onChange={(e) => setProfile('maritalStatus', e.target.value as DistributorUccPayload['profile']['maritalStatus'])}><option value="SINGLE">SINGLE</option><option value="MARRIED">MARRIED</option><option value="WIDOWED">WIDOWED</option><option value="DIVORCED">DIVORCED</option></select></Field>
          </div>
        </section>

        <section className="card space-y-4 border border-gray-100 shadow-sm xl:col-span-7">
          <SectionTitle title="Address" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Address Line 1"><input className="input w-full" value={form.address.addressLine1} onChange={(e) => setAddress('addressLine1', e.target.value)} required /></Field>
            <Field label="Address Line 2"><input className="input w-full" value={form.address.addressLine2 || ''} onChange={(e) => setAddress('addressLine2', e.target.value)} /></Field>
            <Field label="Address Line 3"><input className="input w-full" value={form.address.addressLine3 || ''} onChange={(e) => setAddress('addressLine3', e.target.value)} /></Field>
            <Field label="State"><select className="input w-full" value={form.address.state} onChange={(e) => setAddress('state', e.target.value)}>{STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></Field>
            <Field label="City"><input className="input w-full" value={form.address.city} onChange={(e) => setAddress('city', e.target.value)} required /></Field>
            <Field label="Pincode"><input className="input w-full" value={form.address.pincode} onChange={(e) => setAddress('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} required /></Field>
            <Field label="Occupation"><select className="input w-full" value={form.profile.occupation} onChange={(e) => setProfile('occupation', e.target.value as DistributorUccPayload['profile']['occupation'])}>{OCCUPATIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="Income"><select className="input w-full" value={form.profile.annualIncome} onChange={(e) => setProfile('annualIncome', e.target.value as DistributorUccPayload['profile']['annualIncome'])}>{INCOMES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="Source Of Wealth"><select className="input w-full" value={form.address.sourceOfWealth} onChange={(e) => setAddress('sourceOfWealth', e.target.value)}>{SOURCES_OF_WEALTH.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
          </div>
        </section>

        <section className="card space-y-4 border border-gray-100 shadow-sm xl:col-span-5">
          <SectionTitle title="Bank Accounts" />
          <div className="space-y-5">
            {form.banks.map((bank, index) => (
              <div key={index} className="border border-dashed border-gray-200 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(bank.isDefault)} onChange={(e) => setBank(index, 'isDefault', e.target.checked)} /> Mark as default</label>
                  {form.banks.length > 1 && <button type="button" onClick={() => removeBank(index)} className="text-xs text-red-500 hover:underline">Remove</button>}
                </div>
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                  <Field label="Account Type"><select className="input w-full" value={bank.accountType} onChange={(e) => setBank(index, 'accountType', e.target.value)}>{ACCOUNT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                  <Field label="IFSC"><input className="input w-full uppercase" value={bank.ifscCode} onChange={(e) => setBank(index, 'ifscCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} required /></Field>
                  <Field label="Account Number"><input className="input w-full" value={bank.accountNumber} onChange={(e) => setBank(index, 'accountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))} required /></Field>
                  <Field label="Bank Name"><input className="input w-full" value={bank.bankName} onChange={(e) => setBank(index, 'bankName', e.target.value)} required /></Field>
                </div>
                <Field label="Account Holder"><input className="input w-full" value={bank.accountHolder} onChange={(e) => setBank(index, 'accountHolder', e.target.value)} required /></Field>
              </div>
            ))}
            <button type="button" onClick={addBank} className="px-4 py-2.5 rounded-xl border border-green-400 text-green-600 hover:bg-green-50 text-sm font-medium">Add another account</button>
          </div>
        </section>

        <section className="card space-y-4 border border-gray-100 shadow-sm xl:col-span-4">
          <SectionTitle title="Holding Type" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Account Holding Type"><select className="input w-full" value={form.profile.holdingType} onChange={(e) => setProfile('holdingType', e.target.value as DistributorUccPayload['profile']['holdingType'])}><option value="SINGLE">Single</option><option value="JOINT">Joint</option><option value="ANYONE_OR_SURVIVOR">Anyone Or Survivor</option></select></Field>
          </div>
        </section>

        <section className="card space-y-4 border border-gray-100 shadow-sm xl:col-span-8">
          <SectionTitle title="Nominee" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Nominee Name"><input className="input w-full" value={form.nominees[0].fullName} onChange={(e) => setNomineeField('fullName', e.target.value)} required /></Field>
            <Field label="Relationship"><select className="input w-full" value={form.nominees[0].relationship} onChange={(e) => setNomineeField('relationship', e.target.value)}>{RELATIONSHIPS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="Nominee DOB"><input className="input w-full" type="date" value={form.nominees[0].dob || ''} onChange={(e) => setNomineeField('dob', e.target.value)} /></Field>
            <Field label="Document Number"><input className="input w-full uppercase" value={form.nominees[0].docNumber || ''} onChange={(e) => setNomineeField('docNumber', e.target.value.toUpperCase())} /></Field>
            <Field label="Guardian Name"><input className="input w-full" value={form.nominees[0].guardianName || ''} onChange={(e) => setNomineeField('guardianName', e.target.value)} /></Field>
            <Field label="Guardian Relation"><input className="input w-full" value={form.nominees[0].guardianRel || ''} onChange={(e) => setNomineeField('guardianRel', e.target.value)} /></Field>
          </div>
        </section>

        <section className="card space-y-4 border border-gray-100 shadow-sm xl:col-span-7">
          <SectionTitle title="Documents" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
            Files are uploaded with the client creation request and stored against the investor KYC record.
          </div>
        </section>

        <section className="card space-y-4 border border-gray-100 shadow-sm xl:col-span-5 xl:sticky xl:top-6">
          <SectionTitle title="Verification" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Source"><select className="input w-full" value={form.verification?.source} onChange={(e) => setVerification('source', e.target.value)}>{VERIFICATION_SOURCES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="Source Details"><input className="input w-full" value={form.verification?.sourceDetails || ''} onChange={(e) => setVerification('sourceDetails', e.target.value)} placeholder="Source Details" /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(form.verification?.termsAccepted)} onChange={(e) => setVerification('termsAccepted', e.target.checked)} /> I have read and agree to the Terms & Conditions</label>
        </section>

        <div className="sticky bottom-4 z-10 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-lg flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:col-span-12">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <MapPinned className="w-4 h-4 text-orange-500" />
            {uploadedDocumentCount} document{uploadedDocumentCount === 1 ? '' : 's'} attached. Default password will still be mobile + PAN.
          </div>
          <button type="submit" disabled={loading} className="btn-primary inline-flex items-center justify-center gap-2 min-w-[220px]">
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating NSE UCC...' : 'Create NSE UCC Account'}
          </button>
        </div>
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

function SectionTitle({ title }: { title: string }) {
  return <p className="text-base font-semibold text-orange-500 border-b border-gray-200 pb-2">{title}</p>;
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-orange-500">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
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
    <label className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-4 hover:border-orange-300 hover:bg-orange-50/40 transition cursor-pointer block">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-orange-500 shrink-0">
          <UploadCloud className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-1">{hint}</p>
          <p className="text-xs text-gray-700 mt-3 truncate">{file ? file.name : 'Choose file'}</p>
        </div>
      </div>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}