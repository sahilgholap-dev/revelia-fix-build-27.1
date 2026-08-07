import express from 'express';
import * as rtdnController from '../controllers/rtdn.controller';

const router = express.Router();

router.post('/revenuecat-rtdn', rtdnController.handleRtdn);

export default router;
