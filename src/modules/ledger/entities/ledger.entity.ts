import { Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** 가계부. id가 6자리 초대코드(숫자) */
@Entity('ledgers')
export class Ledger {
  @PrimaryColumn({ type: 'varchar', length: 6 })
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
