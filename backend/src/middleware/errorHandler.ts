import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        if (err.isOperational) {
            logger.warn(`[OperationalError] ${err.errorCode}: ${err.message}`);
        } else {
            logger.error(`[SystemError] ${err.errorCode}: ${err.message} | ${err.stack || ''}`);
        }

        return res.status(err.statusCode).json({
            status: 'error',
            code: err.errorCode,
            message: err.message
        });
    }

    // Unhandled errors
    const errorMsg = err instanceof Error ? err.stack || err.message : String(err);
    logger.error(`[UnhandledError] ${errorMsg}`);
    
    return res.status(500).json({
        status: 'error',
        code: 'E_UNKNOWN',
        message: 'An unexpected error occurred.'
    });
};
