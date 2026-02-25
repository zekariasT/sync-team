import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from './generated/prisma/index.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is missing from your .env file, choom!');
    }

    // PrismaMariaDb takes a string OR a config object. 
    // We use 'as any' for the adapter property to satisfy 
    // the PrismaClient's strict internal v7 types.
    const adapter = new PrismaMariaDb(connectionString);

    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.$connect();
  }
}