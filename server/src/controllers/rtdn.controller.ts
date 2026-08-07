import { Request, Response } from 'express';
import { logger } from '../utils/logger';

export function handleRtdn(req: Request, res: Response): void {
  logger.info('[RTDN] Raw event received', req.body);
  res.status(200).json({ received: true });
}
