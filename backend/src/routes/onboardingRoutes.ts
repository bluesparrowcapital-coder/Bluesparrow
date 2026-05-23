import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  onboardingStatus,
  createProfile,
  fetchProfile,
  getPrefillData,
  saveAddressHandler,
  fetchAddresses,
  saveNomineesHandler,
  nseSubmit,
  nseStatusHandler,
  kycStatus,
  kycCheckKra,
  kycSubmit,
  kycInitiateEkyc,
} from '../controllers/onboardingController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Onboarding flow ─────────────────────────────────────
router.get( '/status',       onboardingStatus);   // Get overall onboarding progress
router.get( '/prefill',      getPrefillData);      // Auto-fill profile from registration data
router.post('/profile',      createProfile);       // Step 2: Save client profile
router.get( '/profile',      fetchProfile);        // Get saved profile
router.post('/address',      saveAddressHandler);  // Step 3: Save address (permanent/correspondence)
router.get( '/address',      fetchAddresses);      // Get saved addresses
router.post('/nominees',     saveNomineesHandler); // Step 4: Save nominees
router.post('/nse-submit',   nseSubmit);           // Submit to NSE MF
router.get( '/nse-status',   nseStatusHandler);    // Get NSE MF registration status

// ─── KYC routes ──────────────────────────────────────────
router.get( '/kyc/status',         kycStatus);        // Get current KYC status + logs
router.post('/kyc/check-kra',      kycCheckKra);      // Check KYC via NSE KYC_CHECK API
router.post('/kyc/submit',         kycSubmit);        // Legacy — delegates to initiate-ekyc
router.post('/kyc/initiate-ekyc',  kycInitiateEkyc);  // Initiate eKYC fresh registration via NSE

export default router;
