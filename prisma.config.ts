declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});