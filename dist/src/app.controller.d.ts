import express from 'express';
import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    root(res: express.Response): express.Response<any, Record<string, any>>;
}
