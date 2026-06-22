import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'setup_state' })
export class SetupState {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id: string;

  @Column({ type: 'boolean', default: false })
  is_initialized: boolean;

  @Column({ type: 'boolean', default: false })
  setup_in_progress: boolean;

  // Portable across Postgres (`timestamp`) and MySQL/SQLite (`datetime`).
  @Column({ type: Date, nullable: true })
  initialized_at: Date | null;

  @UpdateDateColumn()
  updated_at: Date;
}
