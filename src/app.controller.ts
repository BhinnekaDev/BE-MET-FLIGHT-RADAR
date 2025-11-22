import type { Response } from 'express';
import { Controller, Get, Res } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root(@Res() res: Response) {
    return res.redirect('/docs');
  }
}
