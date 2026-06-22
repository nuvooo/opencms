import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  domain: string | null;

  @Column('simple-array', { default: 'en' })
  locales: string[];

  @Column({ name: 'is_template', type: 'boolean', default: false })
  isTemplate: boolean;

  @Column({ name: 'schema_name', length: 50, unique: true })
  schemaName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
