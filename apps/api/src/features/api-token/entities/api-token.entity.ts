import { Base } from '@/common/entities';
import { hashString } from '@/common/utils';
import { User } from '@/features/users/entities/user.entity';
import { BeforeInsert, Column, Entity, ManyToOne, Relation } from 'typeorm';

@Entity()
export class ApiToken extends Base {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  token: string;

  @Column({ type: 'varchar', length: 10 })
  lastChars: string;

  @ManyToOne(() => User, (user) => user.apiTokens, { onDelete: 'CASCADE' })
  user: Relation<User>;

  @Column()
  userId: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @BeforeInsert()
  async hashToken() {
    this.token = await hashString(this.token);
  }
}
