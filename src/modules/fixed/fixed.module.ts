import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FixedEntry } from './entities/fixed-entry.entity';
import { FixedService } from './fixed.service';
import { FixedController } from './fixed.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FixedEntry]),
    LedgerModule,
    AuthModule,
  ],
  controllers: [FixedController],
  providers: [FixedService],
  exports: [FixedService],
})
export class FixedModule {}
