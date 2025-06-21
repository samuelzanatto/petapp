// Declaração de tipos personalizada para Express
import { Request, Response, NextFunction } from 'express';

// Definindo um tipo para os handlers do Express que permite retornar um valor ou void
export type ExpressHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any> | any;

// Declaração global para estender as definições do Express
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}