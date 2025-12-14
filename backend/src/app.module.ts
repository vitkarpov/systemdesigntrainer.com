import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SpaController } from './spa.controller';
import { DatabaseModule } from './db/db.module';
import { InterviewModule } from './interview/interview.module';

@Module({
  imports: [
    DatabaseModule,
    InterviewModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveStaticOptions: {
        index: false,
      },
    }),
  ],
  controllers: [AppController, SpaController],
  providers: [AppService],
})
export class AppModule {}
