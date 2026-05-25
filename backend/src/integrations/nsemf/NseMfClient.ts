/**
 * NSE NMF II — Client Registration Integration (v1.9.6)
 *
 * Implements the 183-Column UCC Registration API per NSE NMF II spec v1.9.6 (November 2025).
 * Sandbox mode is active by default (set NSE_SANDBOX=false to call real API).
 *
 * Required env vars for production:
 *   NSE_MEMBER_ID    — NSE member code (numeric, e.g. 1027899)
 *   NSE_USER_ID      — Member Desk login user ID (defaults to NSE_MEMBER_ID if omitted)
 *   NSE_PASSWORD     — API Secret (PWD) provided by NSE
 *   NSE_LICENSE_KEY  — API Member License KEY (16-char, used as AES-128 key)
 *   NSE_API_URL      — Production base URL (default: https://www.nseinvest.com)
 *   NSE_SANDBOX      — Set to "false" to use real API
 */

import https from 'https';
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger';

// ─── Text value mappings (NSE NMF II v1.9.6 183-col format) ──────────────────

/** occupation_code accepts full-text values per sample JSON */
const OCCUPATION_TEXT: Record<string, string> = {
  BUSINESS:      'BUSINESS',
  SERVICE:       'SERVICE',
  PROFESSIONAL:  'PROFESSIONAL',
  AGRICULTURIST: 'AGRICULTURE',
  RETIRED:       'RETIRED',
  HOUSEWIFE:     'HOUSEWIFE',
  STUDENT:       'STUDENT',
  OTHER:         'OTHERS',
};

/** tax_status accepts full-text values per sample JSON */
const TAX_STATUS_TEXT: Record<string, string> = {
  INDIVIDUAL:  'INDIVIDUAL',
  HUF:         'HUF',
  NRI:         'NRI',
  PIO:         'PIO',
  COMPANY:     'COMPANY',
  PARTNERSHIP: 'PARTNERSHIP',
};

/** Nominee relationship — 2-char codes per field spec (size=2) */
const RELATIONSHIP_CODE: Record<string, string> = {
  SPOUSE:        '01',
  SON:           '02',
  DAUGHTER:      '03',
  FATHER:        '04',
  MOTHER:        '05',
  BROTHER:       '06',
  SISTER:        '07',
  GRANDFATHER:   '08',
  GRANDMOTHER:   '09',
  GRANDSON:      '10',
  GRANDDAUGHTER: '11',
  OTHER:         '99',
};

/**
 * Nominee identity type codes:
 *  1 = PAN, 2 = AADHAAR, 3 = DRIVING LICENCE, 4 = OCI/Passport
 */
const DOC_TYPE_CODE: Record<string, string> = {
  PAN:             '1',
  AADHAAR:         '2',
  DRIVING_LICENSE: '3',
  PASSPORT:        '4',
  VOTER_ID:        '2',   // map to Aadhaar slot (last 4 digits rule applies)
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
  accountType?:       string;   // SB=Savings, CA=Current, NRE, NRO

  // NSE required financial info
  annualIncome?:      string;   // enum: BELOW_1L | 1L_TO_5L | ... | ABOVE_1CR

  // Nominees (up to 3, optional)
  nominees?: Array<{
    fullName:      string;
    relationship:  string;
    percentage:    number;
    dob?:          Date | null;
    guardianName?: string | null;
    docType?:      string;    // AADHAAR | PAN | PASSPORT | DRIVING_LICENSE | VOTER_ID
    docNumber?:    string;    // identity number (Aadhaar: last 4 digits sent to NSE)
  }>;
}

export interface NseRegistrationResult {
  success:     boolean;
  clientCode?: string;
  message:     string;
  rawResponse?: unknown;
}

export interface KycCheckResult {
  pan?:             string;
  name?:            string;
  kycStatus:        'S' | 'F' | null;   // S = success/verified, F = failed/not done
  kycStatusRemark?: string;
  kraName?:         string;
  statusDate?:      string;
  isVerified:       boolean;
}

export interface KycFreshRegResult {
  success: boolean;
  link?:   string;         // eKYC URL to send to the investor
  message: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

class NseMfClient {
  private http: AxiosInstance;
  private readonly memberId:   string;
  private readonly userId:     string;
  private readonly password:   string;
  private readonly licenseKey: string;
  private readonly isSandbox:  boolean;

  constructor() {
    const requestedSandbox = process.env.NSE_SANDBOX !== 'false';
    const hasConfiguredProdCreds = Boolean(
      process.env.NSE_MEMBER_ID
      && process.env.NSE_PASSWORD
      && process.env.NSE_LICENSE_KEY,
    );
    const looksLikeSandboxCreds = (process.env.NSE_PASSWORD ?? '').startsWith('SANDBOX')
      || (process.env.NSE_PASSWORD ?? '').startsWith('your_')
      || process.env.NSE_LICENSE_KEY === 'SANDBOXKEY123456'
      || process.env.NSE_LICENSE_KEY === 'your_16char_license_key';

    // In sandbox mode (default) these values are never sent to a real API,
    // so dummy fallbacks are fine. Replace with real credentials when NSE_SANDBOX=false.
    this.memberId   = process.env.NSE_MEMBER_ID   ?? 'SANDBOX_MEMBER';
    this.userId     = process.env.NSE_USER_ID     ?? process.env.NSE_MEMBER_ID ?? 'SANDBOX_USER';
    this.password   = process.env.NSE_PASSWORD    ?? 'SANDBOX_PASS';
    this.licenseKey = process.env.NSE_LICENSE_KEY ?? 'SANDBOXKEY123456';  // 32-char hex placeholder
    this.isSandbox  = requestedSandbox || !hasConfiguredProdCreds || looksLikeSandboxCreds;

    if (!requestedSandbox && this.isSandbox) {
      logger.warn('NSE_SANDBOX=false but production credentials are missing or still using sandbox placeholders; forcing sandbox mode.');
    } else {
      logger.info(`NSE MF client initialized in ${this.isSandbox ? 'SANDBOX' : 'PRODUCTION'} mode`);
    }

    const baseURL = this.isSandbox
      ? (process.env.NSE_SANDBOX_URL ?? 'https://nseinvestuat.nseindia.com')
      : (process.env.NSE_API_URL     ?? 'https://nseinvest.nseindia.com');

    // NSE Akamai gateway requires TLS 1.3+ and specific headers on every request
    const httpsAgent = new https.Agent({ minVersion: 'TLSv1.3' });

    this.http = axios.create({
      baseURL,
      timeout: 30_000,
      httpsAgent,
      headers: {
        'Content-Type':   'application/json',
        'Accept':         '',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US',
        'Connection':     'keep-alive',
        'User-Agent':     'PostmanRuntime/7.43.0',
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────

  /**
   * Build BASIC Authorization header per NSE NMF II v1.9.6:
   *   plain_text         = API Secret|<RANDOM Number>
   *   aes_encrypted_val  = AES-128-CBC(
   *                          key = LICENSE_KEY decoded from 32-char hex → 16 bytes,
   *                          iv  = 16 random bytes,
   *                          plaintext
   *                        )
   *   Encrypted Password = base64(<iv-hex>::<salt-hex>::<aes_encrypted_val>)
   *   Authorization      = BASIC base64(userId : Encrypted Password)
   */
  private buildAuthHeader(): string {
    if (this.isSandbox) return 'BASIC SANDBOX_AUTH';

    const saltBytes  = crypto.randomBytes(16);
    const ivBytes    = crypto.randomBytes(16);
    const salt       = saltBytes.toString('hex');   // 32 hex chars for envelope
    const iv         = ivBytes.toString('hex');     // 32 hex chars for envelope
    const randomNum  = Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000;
    const plainText  = `${this.password}|${randomNum}`;

    // LICENSE_KEY is a 32-char hex string representing 16 bytes (AES-128 key)
    const keyBuf = Buffer.from(this.licenseKey, 'hex');  // 32 hex → 16 bytes

    const cipher = crypto.createCipheriv('aes-128-cbc', keyBuf, ivBytes);
    let aesEncrypted  = cipher.update(plainText, 'utf8', 'base64');
    aesEncrypted     += cipher.final('base64');

    const encPwd  = Buffer.from(`${iv}::${salt}::${aesEncrypted}`).toString('base64');
    const authStr = `${this.userId}:${encPwd}`;
    return `BASIC ${Buffer.from(authStr).toString('base64')}`;
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

  private isMinor(dob: Date): boolean {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age < 18;
  }

  /**
   * Format nominee identity number per NSE rules:
   *  - Aadhaar / Voter ID: last 4 digits only
   *  - PAN / DL / Passport: full number
   */
  private formatIdentityNumber(docType: string | undefined, docNumber: string | undefined): string {
    if (!docNumber) return '';
    if (docType === 'AADHAAR' || docType === 'VOTER_ID') {
      return docNumber.replace(/\s/g, '').slice(-4);
    }
    return docNumber;
  }

  /** Generate a unique NSE client code: MemberCode prefix + 8-char hex */
  generateClientCode(): string {
    const prefix = this.memberId ? this.memberId.substring(0, 6).toUpperCase() : 'BSP';
    const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${suffix}`;
  }

  // ─── Build registration payload (183-column v1.9.6) ──────────────────────

  private buildNomineeFields(
    n: NonNullable<NseRegistrationPayload['nominees']>[number] | undefined,
    idx: number,
    city: string,
    pincode: string,
  ): Record<string, string> {
    if (!n || !n.fullName.trim()) {
      return {
        [`nominee_${idx}_name`]:            ' ',
        [`nominee_${idx}_relationship`]:    ' ',
        [`nominee_${idx}_applicable`]:      '0',
        [`nominee_${idx}_minor_flag`]:      ' ',
        [`nominee_${idx}_dob`]:             ' ',
        [`nominee_${idx}_guardian`]:        ' ',
        [`nominee_${idx}_guardian_pan`]:    ' ',
        [`nominee_${idx}_identity_type`]:   ' ',
        [`nominee_${idx}_identity_number`]: ' ',
        [`nominee_${idx}_email`]:           '',
        [`nominee_${idx}_mobile`]:          '',
        [`nominee_${idx}_address1`]:        ' ',
        [`nominee_${idx}_address2`]:        ' ',
        [`nominee_${idx}_address3`]:        ' ',
        [`nominee_${idx}_city`]:            ' ',
        [`nominee_${idx}_pin`]:             ' ',
        [`nominee_${idx}_country`]:         ' ',
      };
    }

    const minor = n.dob ? this.isMinor(n.dob) : false;
    return {
      [`nominee_${idx}_name`]:            n.fullName,
      [`nominee_${idx}_relationship`]:    RELATIONSHIP_CODE[n.relationship] ?? '99',
      [`nominee_${idx}_applicable`]:      String(n.percentage),
      [`nominee_${idx}_minor_flag`]:      minor ? 'YES' : 'NO',
      [`nominee_${idx}_dob`]:             n.dob ? this.formatDate(n.dob) : ' ',
      [`nominee_${idx}_guardian`]:        n.guardianName ?? ' ',
      [`nominee_${idx}_guardian_pan`]:    ' ',
      [`nominee_${idx}_identity_type`]:   n.docType ? (DOC_TYPE_CODE[n.docType] ?? '1') : '1',
      [`nominee_${idx}_identity_number`]: this.formatIdentityNumber(n.docType, n.docNumber),
      [`nominee_${idx}_email`]:           '',
      [`nominee_${idx}_mobile`]:          '',
      [`nominee_${idx}_address1`]:        'SAME ADDRESS OF FIRST HOLDER',
      [`nominee_${idx}_address2`]:        ' ',
      [`nominee_${idx}_address3`]:        ' ',
      [`nominee_${idx}_city`]:            city,
      [`nominee_${idx}_pin`]:             pincode,
      [`nominee_${idx}_country`]:         'INDIA',
    };
  }

  private buildBody(data: NseRegistrationPayload, clientCode: string) {
    const { first, middle, last } = this.parseName(data.fullNameAsPan);
    const nom         = data.nominees?.filter((n) => n.fullName.trim()) ?? [];
    const hasNominees = nom.length > 0;
    const genderText  = data.gender === 'M' ? 'MALE' : data.gender === 'F' ? 'FEMALE' : 'MALE';
    const mobile10    = data.mobile.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);

    return {
      reg_details: [{
        client_code:                      clientCode,
        primary_holder_first_name:        first,
        primary_holder_middle_name:       middle || ' ',
        primary_holder_last_name:         last,
        tax_status:                       TAX_STATUS_TEXT[data.taxStatus]  ?? 'INDIVIDUAL',
        gender:                           genderText,
        primary_holder_dob_incorporation: this.formatDate(data.dob),
        occupation_code:                  OCCUPATION_TEXT[data.occupation] ?? 'OTHERS',
        holding_nature:                   'SINGLE',

        // Joint/third holders (not applicable for single)
        second_holder_first_name:         ' ', second_holder_middle_name: ' ', second_holder_last_name: ' ',
        third_holder_first_name:          ' ', third_holder_middle_name:  ' ', third_holder_last_name:  ' ',
        second_holder_dob:                ' ', third_holder_dob:          ' ',

        // Guardian (not applicable for adult)
        guardian_first_name:  ' ', guardian_middle_name: ' ', guardian_last_name: ' ', guardian_dob: ' ',

        // PAN exempt flags
        primary_holder_pan_exempt: 'NO',
        second_holder_pan_exempt:  ' ',
        third_holder_pan_exempt:   ' ',
        guardian_pan_exempt:       ' ',

        // PAN numbers
        primary_holder_pan:        data.panNumber,
        second_holder_pan:         ' ',
        third_holder_pan:          ' ',
        guardian_pan:              ' ',

        // Exempt categories (leave blank for regular PAN holders)
        primary_holder_exempt_category: ' ', second_holder_exempt_category: ' ',
        third_holder_exempt_category:   ' ', guardian_exempt_category:      ' ',

        // Account / DP settings
        client_type: 'NON DEMAT',
        pms:         'NO',
        default_dp:  'PHYS',
        cdsl_dpid:   ' ', cdslcltid: ' ',
        cmbp_id:     this.memberId || ' ',
        nsdldpid:    ' ', nsdlcltid: ' ',

        // Bank account 1 (primary)
        account_type_1:      data.accountType ?? 'SB',
        account_no_1:        data.bankAccountNumber,
        micr_no_1:           ' ',
        ifsc_code_1:         data.bankIfsc.toUpperCase(),
        default_bank_flag_1: 'YES',

        // Banks 2–5 (unused)
        account_type_2: ' ', account_no_2: ' ', micr_no_2: ' ', ifsc_code_2: ' ', default_bank_flag_2: ' ',
        account_type_3: ' ', account_no_3: ' ', micr_no_3: ' ', ifsc_code_3: ' ', default_bank_flag_3: ' ',
        account_type_4: ' ', account_no_4: ' ', micr_no_4: ' ', ifsc_code_4: ' ', default_bank_flag_4: ' ',
        account_type_5: ' ', account_no_5: ' ', micr_no_5: ' ', ifsc_code_5: ' ', default_bank_flag_5: ' ',

        // Cheque / payment preferences
        cheque_name:   data.fullNameAsPan,
        div_pay_mode:  '1',       // 1 = Electronic (NEFT/ECS)

        // Indian address
        address_1: data.addressLine1.substring(0, 40),
        address_2: (data.addressLine2 ?? '').substring(0, 40),
        address_3: ' ',
        city:      data.city,
        state:     data.state,
        pincode:   data.pincode,
        country:   'INDIA',

        resi_phone: ' ', resi_fax: ' ', office_phone: ' ', office_fax: ' ',

        // Contact
        email:              data.email,
        communication_mode: 'ELECTRONIC',
        indian_mobile_no:   mobile10,

        // Foreign address (not applicable)
        foreign_address_1: ' ', foreign_address_2: ' ', foreign_address_3: ' ',
        foreign_address_city: ' ', foreign_address_pincode: ' ', foreign_address_state: ' ',
        foreign_address_country: ' ', foreign_address_resi_phone: ' ',
        foreign_address_fax: ' ', foreign_address_off_phone: ' ', foreign_address_off_fax: ' ',

        // KYC details
        primary_holder_kyc_type:          data.kycStatus === 'Y' ? 'KYC COMPLIANT' : 'KYC NOT COMPLIANT',
        primary_holder_ckyc_number:       ' ',
        second_holder_kyc_type:           ' ', second_holder_ckyc_number: ' ',
        third_holder_kyc_type:            ' ', third_holder_ckyc_number:  ' ',
        guardian_kyc_type:                ' ', guardian_ckyc_number:      ' ',
        primary_holder_kra_exempt_ref_no: ' ',
        second_holder_kra_exempt_ref_no:  ' ',
        third_holder_kra_exempt_ref_no:   ' ',
        guardian_exempt_ref_no:           ' ',

        // AADHAAR / MAPIN / paperless
        aadhaar_updated: 'YES',
        mapin_id:        ' ',
        paperless_flag:  'P',      // P = Paper, Z = Paperless
        lei_no:          ' ', lei_validity: ' ',

        // Declaration flags
        mobile_declaration_flag: 'Self',
        email_declaration_flag:  'Self',

        // Second / third holder contact (not applicable)
        second_holder_email: ' ', second_holder_email_declaration: ' ',
        second_holder_mobile: ' ', second_holder_mobile_declaration: ' ',
        third_holder_email: ' ', third_holder_email_declaration: ' ',
        third_holder_mobile: ' ', third_holder_mobile_declaration: ' ',
        guardian_relation: ' ',

        // Nomination
        nomination_opt:            hasNominees ? 'Y' : 'N',
        nomination_authentication: hasNominees ? 'O' : 'V',

        // Nominees 1–3
        ...this.buildNomineeFields(nom[0], 1, data.city, data.pincode),
        ...this.buildNomineeFields(nom[1], 2, data.city, data.pincode),
        ...this.buildNomineeFields(nom[2], 3, data.city, data.pincode),

        nominee_soa:           hasNominees ? 'Y' : 'N',
        nominee_opt_out_ref_no: hasNominees ? ' ' : '0',

        // Registration status fields (populated by NSE in response)
        reg_id:     '',
        reg_status: '',
        reg_remark: '',
      }],
    };
  }

  // ─── Sandbox simulation ───────────────────────────────────

  private sandboxResult(clientCode: string): NseRegistrationResult {
    logger.info(`[NSE SANDBOX] Client registered: ${clientCode}`);
    return {
      success:     true,
      clientCode,
      message:     'Client registered successfully (SANDBOX MODE)',
      rawResponse: { reg_details: [{ reg_status: 'REG_SUCCESS', client_code: clientCode, reg_remark: 'SUCCESS' }] },
    };
  }

  // ─── Public: Register Client ──────────────────────────────

  async registerClient(
    data: NseRegistrationPayload,
    clientCode: string,
  ): Promise<NseRegistrationResult> {
    if (this.isSandbox) return this.sandboxResult(clientCode);

    try {
      const body    = this.buildBody(data, clientCode);
      const headers = {
        'Content-Type': 'application/json',
        Accept:         'application/json',
        memberId:       this.memberId,
        Authorization:  this.buildAuthHeader(),
      };

      const response = await this.http.post(
        '/nsemfdesk/api/v2/registration/CLIENTCOMMON183',
        body,
        { headers },
      );
      const raw    = response.data;
      const detail = raw?.reg_details?.[0];

      if (detail?.reg_status === 'REG_SUCCESS') {
        return {
          success:     true,
          clientCode:  detail.client_code ?? clientCode,
          message:     detail.reg_remark  ?? 'Registered successfully',
          rawResponse: raw,
        };
      }

      return {
        success:     false,
        message:     detail?.reg_remark ?? raw?.message ?? 'NSE registration failed',
        rawResponse: raw,
      };
    } catch (err: any) {
      const detail = err?.response?.data;
      logger.error('NSE MF registerClient error:', detail ?? err.message);
      return {
        success:     false,
        message:     detail?.message ?? err.message ?? 'NSE API call failed',
        rawResponse: detail,
      };
    }
  }

  // ─── Public: KYC Status Check ─────────────────────────────
  // POST /nsemfdesk/api/v2/utility/KYC_CHECK

  async checkKycStatus(panNo: string): Promise<KycCheckResult> {
    if (this.isSandbox) {
      logger.info(`[NSE SANDBOX] KYC check for PAN: ${panNo}`);
      return { pan: panNo, kycStatus: 'S', kycStatusRemark: 'KYC REGISTERED', kraName: 'camskra', isVerified: true };
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        Accept:         'application/json',
        memberId:       this.memberId,
        Authorization:  this.buildAuthHeader(),
      };
      const response = await this.http.post(
        '/nsemfdesk/api/v2/utility/KYC_CHECK',
        { pan_no: panNo },
        { headers },
      );
      const raw = response.data;

      return {
        pan:             raw.pan,
        name:            raw.name,
        kycStatus:       raw.kyc_status ?? null,
        kycStatusRemark: raw.kyc_status_remark,
        kraName:         raw.kra_name,
        statusDate:      raw.status_date,
        isVerified:      raw.kyc_status === 'S',
      };
    } catch (err: any) {
      const detail = err?.response?.data;
      logger.error('NSE KYC check error:', detail ?? err.message);
      // If API returns "not found" treat as unverified, not hard error
      return { kycStatus: null, isVerified: false, kycStatusRemark: detail?.message ?? err.message };
    }
  }

  // ─── Public: KYC Fresh eKYC Registration ──────────────────
  // POST /nsemfdesk/api/v1/EKYC/EKYCREG  (v1 endpoint)

  async freshRegisterKyc(panNo: string, mobileNo: string, invEmail: string): Promise<KycFreshRegResult> {
    if (this.isSandbox) {
      logger.info(`[NSE SANDBOX] KYC fresh register for PAN: ${panNo}`);
      return {
        success: true,
        link:    `https://nseinvestuat.nseindia.com/nsemfdesk/ekycVerifyByUser/SANDBOX_${panNo}`,
        message: 'EKYC FRESH REGISTRATION REQUEST RECEIVED (SANDBOX)',
      };
    }

    try {
      const amcCode = process.env.NSE_AMC_CODE ?? 'AXF';
      const headers = {
        'Content-Type': 'application/json',
        Accept:         'application/json',
        memberId:       this.memberId,
        Authorization:  this.buildAuthHeader(),
      };
      const mobile10 = mobileNo.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
      const response = await this.http.post(
        '/nsemfdesk/api/v1/EKYC/EKYCREG',
        { amcCode, panNo, mobileNo: mobile10, invEmail },
        { headers },
      );
      const raw = response.data;
      return {
        success: true,
        link:    raw.link,
        message: raw.message ?? 'eKYC registration request received',
      };
    } catch (err: any) {
      const detail = err?.response?.data;
      logger.error('NSE KYC fresh register error:', detail ?? err.message);
      return { success: false, message: detail?.message ?? err.message ?? 'eKYC registration failed' };
    }
  }

  // ─── Public: Get Client Status ────────────────────────────

  async getClientStatus(clientCode: string): Promise<{ active: boolean; message: string }> {
    if (this.isSandbox) return { active: true, message: 'Active (SANDBOX)' };

    try {
      const headers = {
        'Content-Type': 'application/json',
        Accept:         'application/json',
        memberId:       this.memberId,
        Authorization:  this.buildAuthHeader(),
      };
      const response = await this.http.post(
        '/nsemfdesk/api/v2/report/CLIENT_DETAILS',
        { client_code: clientCode },
        { headers },
      );
      const raw    = response.data;
      const detail = raw?.reg_details?.[0] ?? raw;
      return {
        active:  detail?.reg_status !== 'REG_FAILED',
        message: detail?.reg_remark ?? raw?.message ?? 'Unknown',
      };
    } catch (err: any) {
      logger.error('NSE MF getClientStatus error:', err.message);
      return { active: false, message: err.message };
    }
  }
}

export const nseMfClient = new NseMfClient();
