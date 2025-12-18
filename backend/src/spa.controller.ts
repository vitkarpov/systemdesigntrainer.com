import { Controller, Get, Res, Req, Next } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class SpaController {
  @Public()
  @Get('*')
  serveSpa(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): void {
    // Don't handle API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  }
}
