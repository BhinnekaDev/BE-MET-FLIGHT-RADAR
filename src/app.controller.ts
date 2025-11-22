import express from 'express';
import { AppService } from './app.service';
import { Controller, Get, Res } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root(@Res() res: express.Response) {
    return res.json({ message: this.appService.getHello() });
  }
}
