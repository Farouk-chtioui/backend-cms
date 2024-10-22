import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tabs')
export class Tab {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  icon: string;

  @Column({ default: true })
  visible: boolean;

  @Column({ default: false })
  isHome: boolean;
}
