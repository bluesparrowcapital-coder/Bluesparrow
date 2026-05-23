import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  addBankHandler,
  getBankHandler,
  setDefaultHandler,
  deleteBankHandler,
} from '../controllers/bankController';

const router = Router();

// All bank routes require authentication
router.use(authenticate);

router.post('/',              addBankHandler);
router.get('/',               getBankHandler);
router.patch('/:id/default',  setDefaultHandler);
router.delete('/:id',         deleteBankHandler);

export default router;
