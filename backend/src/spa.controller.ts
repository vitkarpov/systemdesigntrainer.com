import { Controller, Get, Res, Req, Next } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { join } from 'path';

@Controller()
export class SpaController {
  @Get('*')
  serveSpa(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction): void {
    // Don't handle API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  }
}
