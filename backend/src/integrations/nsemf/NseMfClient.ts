/**
 * NSE NMF II — Client Registration Integration
 *
 * Sandbox mode is active by default (NSE_SANDBOX=false to disable).
 * Set env vars to activate real API:
 *   NSE_MEMBER_ID   — Your NSE NMF member code (ARN holder code)
 *   NSE_PASSWORD    — API password from NSE member portal
 *   NSE_API_URL     — Production base URL (default: https://www.nsenmf.com/MFService)
 *   NSE_SANDBOX     — Set to "false" to use real API
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger';

// ─── Code mappings (NSE NMF II spec) ─────────────────────────────────────────

const OCCUPATION_CODE: Record<string, string> = {
  BUSINESS:     '01',
  SERVICE:      '02',
  PROFESSIONAL: '03',
  AGRICULTURIST:'04',
  RETIRED:      '05',
  HOUSEWIFE:    '06',
  STUDENT:      '07',
  OTHER:        '08',
};

const TAX_STATUS_CODE: Record<string, string> = {
  INDIVIDUAL:  '01',
  HUF:         '02',
  NRI:         '03',
  PIO:         '04',
  COMPANY:     '07',
  PARTNERSHIP: '08',
};

const RELATIONSHIP_CODE: Record<string, string> = {
  SPOUSE:      '01',
  SON:         '02',
  DAUGHTER:    '03',
  FATHER:      '04',
  MOTHER:      '05',
  BROTHER:     '06',
  SISTER:      '07',
  GRANDFATHER: '08',
  GRANDMOTHER: '09',
  GRANDSON:    '10',
  GRANDDAUGHTER: '11',
  OTHER:       '99',
};

const STATE_CODE: Record<string, string> = {
  'ANDHRA PRADESH':    'AP', 'ARUNACHAL PRADESH': 'AR', 'ASSAM':       'AS',
  'BIHAR':             'BR', 'CHHATTISGARH':      'CG', 'GOA':         'GA',
  'GUJARAT':           'GJ', 'HARYANA':           'HR', 'HIMACHAL PRADESH': 'HP',
  'JHARKHAND':         'JH', 'KARNATAKA':         'KA', 'KERALA':      'KL',
  'MADHYA PRADESH':    'MP', 'MAHARASHTRA':       'MH', 'MANIPUR':     'MN',
  'MEGHALAYA':         'ML', 'MIZORAM':           'MZ', 'NAGALAND':    'NL',
  'ODISHA':            'OD', 'PUNJAB':            'PB', 'RAJASTHAN':   'RJ',
  'SIKKIM':            'SK', 'TAMIL NADU':        'TN', 'TELANGANA':   'TS',
  'TRIPURA':           'TR', 'UTTAR PRADESH':     'UP', 'UTTARAKHAND': 'UK',
  'WEST BENGAL':       'WB', 'DELHI':             'DL', 'JAMMU AND KASHMIR': 'JK',
  'JAMMU & KASHMIR':   'JK', 'LADAKH':            'LA', 'CHANDIGARH':  'CH',
  'PUDUCHERRY':        'PY', 'ANDAMAN AND NICOBAR ISLANDS': 'AN',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NseRegistrationPayload {
  // Client identity
  panNumber:          string;
  fullNameAsPan:      string;
  dob:                Date;
  gender:             string;      // M / F / T
  fatherOrSpouseName: string;
  occupation:         string;
  taxStatus:          string;
  email:              string;
  mobile:             string;
  isPep:              boolean;
  kycStatus:          'Y' | 'N';

  // Address (PERMANENT)
  addressLine1:       string;
  addressLine2?:      string | null;
  city:               string;
  state:              string;
  pincode:            string;

  // Bank account (primary)
  bankIfsc:           string;
  bankAccountNumber:  string;
  bankName:           string;
  accountHolder:      string;

  // Nominees (up to 3, optional)
  nominees?: Array<{
    fullName:      string;
    relationship:  string;
    percentage:    number;
    dob?:          Date | null;
    guardianName?: string | null;
  }>;
}

export interface NseRegistrationResult {
  success:     boolean;
  clientCode?: string;
  message:     string;
  rawResponse?: unknown;
}

// ─── Client ───────────────────────────────────────────────────────────────────

class NseMfClient {
  private http: AxiosInstance;
  private readonly memberId:   string;
  private readonly password:   string;
  private readonly isSandbox:  boolean;

  constructor() {
    this.memberId  = process.env.NSE_MEMBER_ID ?? '';
    this.password  = process.env.NSE_PASSWORD  ?? '';
    this.isSandbox = process.env.NSE_SANDBOX   !== 'false';

    const baseURL = this.isSandbox
      ? (process.env.NSE_SANDBOX_URL ?? 'https://nmfsandbox.nseindia.com/MFService')
      : (process.env.NSE_API_URL     ?? 'https://www.nsenmf.com/MFService');

    this.http = axios.create({
      baseURL,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────

  private encryptPassword(): string {
    if (this.isSandbox) return 'SANDBOX_ENC';
    return crypto.createHash('md5').update(this.password).digest('hex').toUpperCase();
  }

  private formatDate(d: Date): string {
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private parseName(full: string) {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return { first: parts[0], middle: '',                               last: '.' };
    if (parts.length === 2) return { first: parts[0], middle: '',                               last: parts[1] };
    return                         { first: parts[0], middle: parts.slice(1, -1).join(' '),     last: parts[parts.length - 1] };
  }

  private stateCode(name: string): string {
    return STATE_CODE[name.toUpperCase()] ?? name.substring(0, 2).toUpperCase();
  }

  /** Generate a unique NSE client code: MemberCode prefix + 8-char hex */
  generateClientCode(): string {
    const prefix = this.memberId ? this.memberId.substring(0, 6).toUpperCase() : 'BSP';
    const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${suffix}`;
  }

  // ─── Build registration payload ───────────────────────────

  private buildBody(data: NseRegistrationPayload, clientCode: string) {
    const { first, middle, last } = this.parseName(data.fullNameAsPan);
    const nom = data.nominees ?? [];

    return {
      MemberCode:  this.memberId || 'SANDBOX',
      Password:    this.encryptPassword(),
      ClientCode:  clientCode,
      HoldingType: 'SI',                                         // Single investor

      // Personal
      TaxStatus:   TAX_STATUS_CODE[data.taxStatus]  ?? '01',
      FirstName:   first,
      MiddleName:  middle,
      LastName:    last,
      Gender:      data.gender === 'T' ? 'M' : data.gender,      // NSE only M/F
      DOBDate:     this.formatDate(data.dob),
      OccupCode:   OCCUPATION_CODE[data.occupation] ?? '08',
      PANNo:       data.panNumber,
      PANExempt:   'N',
      KYCStatus:   data.kycStatus,
      PepFlag:     data.isPep ? 'Y' : 'N',
      FatherName:  data.fatherOrSpouseName,

      // Contact
      Email:       data.email,
      MobileNo:    data.mobile.replace(/^\+91/, '').replace(/\D/g, '').slice(-10),

      // Address
      Address1:    data.addressLine1.substring(0, 40),
      Address2:    (data.addressLine2 ?? '').substring(0, 40),
      Address3:    '',
      City:        data.city,
      State:       this.stateCode(data.state),
      Pincode:     data.pincode,
      Country:     'IN',

      // Bank
      BankIFSC:        data.bankIfsc.toUpperCase(),
      BankCode:        data.bankIfsc.substring(0, 4).toUpperCase(),
      BankAccountNo:   data.bankAccountNumber,
      AccountType:     'SB',    // Savings — default; extend if needed

      // Nominees (up to 3)
      NomineeName1:     nom[0]?.fullName      ?? '',
      NomineeRelation1: RELATIONSHIP_CODE[nom[0]?.relationship ?? ''] ?? '99',
      NomineePercent1:  nom[0]?.percentage    ?? 0,
      NomineeDOB1:      nom[0]?.dob ? this.formatDate(nom[0].dob!) : '',
      NomineeGuardian1: nom[0]?.guardianName  ?? '',

      NomineeName2:     nom[1]?.fullName      ?? '',
      NomineeRelation2: RELATIONSHIP_CODE[nom[1]?.relationship ?? ''] ?? '99',
      NomineePercent2:  nom[1]?.percentage    ?? 0,
      NomineeDOB2:      nom[1]?.dob ? this.formatDate(nom[1].dob!) : '',
      NomineeGuardian2: nom[1]?.guardianName  ?? '',

      NomineeName3:     nom[2]?.fullName      ?? '',
      NomineeRelation3: RELATIONSHIP_CODE[nom[2]?.relationship ?? ''] ?? '99',
      NomineePercent3:  nom[2]?.percentage    ?? 0,
      NomineeDOB3:      nom[2]?.dob ? this.formatDate(nom[2].dob!) : '',
      NomineeGuardian3: nom[2]?.guardianName  ?? '',
    };
  }

  // ─── Sandbox simulation ───────────────────────────────────

  private sandboxResult(clientCode: string): NseRegistrationResult {
    logger.info(`[NSE SANDBOX] Client registered: ${clientCode}`);
    return {
      success:     true,
      clientCode,
      message:     'Client registered successfully (SANDBOX MODE)',
      rawResponse: { Status: '0', StatusDesc: 'SUCCESS', ClientCode: clientCode },
    };
  }

  // ─── Public: Register Client ──────────────────────────────

  async registerClient(
    data: NseRegistrationPayload,
    clientCode: string,
  ): Promise<NseRegistrationResult> {
    if (this.isSandbox) return this.sandboxResult(clientCode);

    try {
      const body     = this.buildBody(data, clientCode);
      const response = await this.http.post('/ClientRegistration', body);
      const raw      = response.data;

      if (raw.Status === '0' || raw.StatusDesc?.toUpperCase() === 'SUCCESS') {
        return {
          success:     true,
          clientCode:  raw.ClientCode ?? clientCode,
          message:     raw.StatusDesc ?? 'Registered successfully',
          rawResponse: raw,
        };
      }

      return { success: false, message: raw.StatusDesc ?? 'NSE registration failed', rawResponse: raw };
    } catch (err: any) {
      const detail = err?.response?.data;
      logger.error('NSE MF registerClient error:', detail ?? err.message);
      return {
        success:     false,
        message:     detail?.StatusDesc ?? err.message ?? 'NSE API call failed',
        rawResponse: detail,
      };
    }
  }

  // ─── Public: Get Client Status ────────────────────────────

  async getClientStatus(clientCode: string): Promise<{ active: boolean; message: string }> {
    if (this.isSandbox) return { active: true, message: 'Active (SANDBOX)' };

    try {
      const response = await this.http.get('/ClientDetail', {
        params: {
          MemberCode:  this.memberId,
          Password:    this.encryptPassword(),
          ClientCode:  clientCode,
        },
      });
      const raw = response.data;
      return { active: raw.Status === '0', message: raw.StatusDesc ?? 'Unknown' };
    } catch (err: any) {
      logger.error('NSE MF getClientStatus error:', err.message);
      return { active: false, message: err.message };
    }
  }
}

export const nseMfClient = new NseMfClient();
