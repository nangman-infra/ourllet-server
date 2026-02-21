import { Module } from '@nestjs/common';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { EntriesModule } from '../entries/entries.module';
import { FixedModule } from '../fixed/fixed.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [EntriesModule, FixedModule, AuthModule],
  controllers: [SettlementController],
  providers: [SettlementService],
})
export class SettlementModule {}
