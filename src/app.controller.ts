import express from 'express';
import { Controller, Get, Res } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root(@Res() res: express.Response) {
    return res.redirect('/docs');
  }
}
