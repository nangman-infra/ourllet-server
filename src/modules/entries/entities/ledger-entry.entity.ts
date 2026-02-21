import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export const LEDGER_ENTRY_TYPE_INCOME = 'income';
export const LEDGER_ENTRY_TYPE_EXPENSE = 'expense';
export const LEDGER_ENTRY_TYPE_SAVINGS = 'savings';
export type LedgerEntryType =
  | typeof LEDGER_ENTRY_TYPE_INCOME
  | typeof LEDGER_ENTRY_TYPE_EXPENSE
  | typeof LEDGER_ENTRY_TYPE_SAVINGS;

@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 6 })
  ledgerId: string;

  @Column({ type: 'uuid' })
  userId: string;

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

  /** 저축(type=savings)일 때만 사용. 예금, 적금, 주식, 채권 등 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ type: 'date' })
  date: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

/** 저축 기본 카테고리 (직접 추가 가능) */
export const DEFAULT_SAVINGS_CATEGORIES = ['예금', '적금', '주식', '채권'] as const;
