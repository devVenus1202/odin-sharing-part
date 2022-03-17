import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationEntitysModule } from '../../organizations.module';
import { OrganizationUsersModule } from '../organizations.users.module';
import { OrganizationsUsersGroupsController } from './organizations.users.groups.controller';
import { OrganizationsUsersGroupsRepository } from './organizations.users.groups.repository';
import { OrganizationUserEntityRepository } from '../organizations.users.repository';

import { OrganizationsUsersGroupsService } from './organizations.users.groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ OrganizationsUsersGroupsRepository, OrganizationUserEntityRepository ]),
    OrganizationEntitysModule,
    OrganizationUsersModule,
  ],
  controllers: [
    OrganizationsUsersGroupsController,
  ],
  providers: [
    OrganizationsUsersGroupsService,
  ],
  exports: [
    OrganizationsUsersGroupsService,
  ],
})

export class OrganizationsUsersGroupsModule {
}
