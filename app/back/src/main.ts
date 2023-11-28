// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module.js';
// import cookieParser from 'cookie-parser';
// import { NestExpressApplication } from '@nestjs/platform-express';
// import { join, dirname } from 'path';
// import { readFile } from 'fs/promises';
// import { fileURLToPath } from 'url';
// import { env } from 'process';

// async function bootstrap() {
//   // Very Very Bad solution because this line ignores cert key chain checks!
//   env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
//   const certs = join(dirname(fileURLToPath(import.meta.url)), '..', 'certs');
//   const httpsOptions = {
//     key: await readFile(join(certs, 'cert.key')),
//     cert: await readFile(join(certs, 'cert.crt')),
//   };
//   const app: NestExpressApplication = await NestFactory.create<NestExpressApplication>(
//     AppModule,
//     {
//       httpsOptions,
//       logger: ['debug', 'log', 'warn', 'error'],
//       bodyParser: false,
//     });
//   app.enableCors(); // CORSを有効にする
//   app.use(cookieParser());
//   await app.listen(3000);
// }
// bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ServeStaticModule } from '@nestjs/serve-static'; // 追加
import cookieParser from 'cookie-parser';
import { join, dirname } from 'path';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { env } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function bootstrap() {
  env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const certs = join(dirname(fileURLToPath(import.meta.url)), '..', 'certs');
  const httpsOptions = {
    key: await readFile(join(certs, 'cert.key')),
    cert: await readFile(join(certs, 'cert.crt')),
  };
  const app = await NestFactory.create(AppModule, {
    httpsOptions,
    bodyParser: false,
  });

  // // ServeStaticModuleを使用して静的ファイルの設定を行う
  ServeStaticModule.forRoot({
    rootPath: join(__dirname, '..', '..', 'front', 'static'), // 静的ファイルのディレクトリ
    serveRoot: '/static', // URLプレフィックス
  });
  app.use(cookieParser());
  await app.listen(3000);
}
bootstrap();
