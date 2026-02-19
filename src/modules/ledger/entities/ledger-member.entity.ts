import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Ledger } from './ledger.entity';
import { User } from '../../auth/entities/user.entity';

/** 가계부-사용자 소속. 한 가계부당 최대 2명 */
@Entity('ledger_members')
export class LedgerMember {
  @PrimaryColumn({ type: 'varchar', length: 6 })
  ledgerId: string;

  @PrimaryColumn('uuid')
  userId: string;

  @ManyToOne(() => Ledger, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ledgerId' })
  ledger: Ledger;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
