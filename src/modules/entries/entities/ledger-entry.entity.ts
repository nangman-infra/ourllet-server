import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export const LEDGER_ENTRY_TYPE_INCOME = 'income';
export const LEDGER_ENTRY_TYPE_EXPENSE = 'expense';
export type LedgerEntryType = typeof LEDGER_ENTRY_TYPE_INCOME | typeof LEDGER_ENTRY_TYPE_EXPENSE;

@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  type: LedgerEntryType;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: {
      from: (v: string | null) => (v == null ? 0 : parseFloat(v)),
      to: (v: number) => v,
    },
  })
  amount: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ type: 'date' })
  date: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
