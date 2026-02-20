import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** 가계부. id가 6자리 초대코드(숫자) */
@Entity('ledgers')
export class Ledger {
  @PrimaryColumn({ type: 'varchar', length: 6 })
  id: string;

  /** 사용자가 설정한 가계부 이름 (설정 탭에서 수정) */
  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  name: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
