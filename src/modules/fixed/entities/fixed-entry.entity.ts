import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export const FIXED_TYPE_EXPENSE = 'expense';
export const FIXED_TYPE_INCOME = 'income';
export type FixedEntryType = typeof FIXED_TYPE_EXPENSE | typeof FIXED_TYPE_INCOME;

/** 고정비 지출/수입. 매월 지정한 날짜에 발생하는 항목 */
@Entity('fixed_entries')
export class FixedEntry {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 6 })
  ledgerId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  type: FixedEntryType;

  @Column({ type: 'varchar', length: 100 })
  category: string;

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

  /** 매월 몇 일에 발생하는지 (1–31) */
  @Column({ type: 'smallint' })
  dayOfMonth: number;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/** 기본 제공 카테고리 (고정비 지출) */
export const DEFAULT_EXPENSE_CATEGORIES = [
  '월세',
  '관리비',
  '통신비',
  'OTT',
  '구독',
  '대출',
] as const;

/** 기본 제공 카테고리 (고정비 수입) */
export const DEFAULT_INCOME_CATEGORIES = ['월급', '부업'] as const;
