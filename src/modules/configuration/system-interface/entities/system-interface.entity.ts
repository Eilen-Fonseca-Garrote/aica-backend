import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('system_interfaces')
export class SystemInterfaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '/img/aica-logo.jpg' })
  logo: string;

  @Column({ default: '/favicon.ico' })
  favicon: string;

  @Column({ default: '#0a8ca8', name: 'primary_color' })
  primaryColor: string;

  @Column({ default: '#0B1A20', name: 'sidebar_color' })
  sidebarColor: string;
}
