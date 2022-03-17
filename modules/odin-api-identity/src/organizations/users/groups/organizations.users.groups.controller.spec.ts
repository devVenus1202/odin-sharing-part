import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { APIClient } from "@d19n/client/dist/common/APIClient";
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationsUsersGroupsService } from './organizations.users.groups.service';
import { OrganizationUserEntityLoginHistoryService } from '../authentication/organizations.users.authentication.login.history.service';
import { OrganizationsUsersGroupsController } from './organizations.users.groups.controller';
import { Utilities } from "@d19n/client/dist/helpers/Utilities";
import { SERVICE_NAME } from "@d19n/client/dist/helpers/Services";
import { JWTResponse } from '../../../utilities/JWTResponse';
import { AuthUserHelper } from '../../../helpers/AuthUserHelper';

export type MockType<T> = {
    [P in keyof T]?: jest.Mock<{}>;
};

export const mockRepository = jest.fn(() => ({
    metadata: {
        columns: [],
        relations: [],
    },
}));

jest.setTimeout(300000000);
describe('OrganizationsUsersGroupsController', () => {
    let controller: OrganizationsUsersGroupsController;
    let userService: OrganizationsUsersGroupsService;
    let repositoryMock: MockType<Repository<OrganizationUserEntity>>;
    let app: TestingModule;
    let principal: OrganizationUserEntity;
    let authToken: string;
    let adminLoginResponse: any;
    let constantToken: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQxYWJkMzMyLTY1Y2ItNDBlYS1hZjcwLTg3MzY0ZDJkMGZmMiIsImlhdCI6MTYzODg5ODI1NCwiZXhwIjoxNjM4OTg0NjU0fQ.2JimJOWvuHAqYEorB62xOWFQzGCSUsrl8EphNhWV8PE';
    beforeAll(async () => {
        app = await Test.createTestingModule({
            controllers: [OrganizationsUsersGroupsController],
            providers: [
                {
                    provide: OrganizationsUsersGroupsService,
                    useValue: {
                        moveUsersToGroup: jest.fn(),
                    },
                },
                {
                    provide: OrganizationUserEntityLoginHistoryService,
                    useValue: {

                    }
                }
            ],
        }).compile();
        userService = app.get<OrganizationsUsersGroupsService>(OrganizationsUsersGroupsService);
        controller = app.get<OrganizationsUsersGroupsController>(OrganizationsUsersGroupsController);

        adminLoginResponse = await AuthUserHelper.login(null, null);
        
    });


    describe('assign users to another groups', () => {
        it('assign users to another groups', async (done) => {
            const groupIds = ["fd59640c-386a-47ad-98f1-faddf005512c"];
            const userIds = ["fb9b3999-23be-4a1b-891d-5e2af9066705", "cc1fb011-d2b6-45eb-8d2d-d048f1ead940", "41abd332-65cb-40ea-af70-87364d2d0ff2"];
            const updatedGroups = await APIClient.call<any>({
                facility: 'http',
                baseUrl: Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
                service: `v1.0/rbac/groups/assign-users`,
                method: 'post',
                body: {
                    groupIds,
                    userIds
                },
                headers: { Authorization: `Bearer ${constantToken}` },
                debug: false,
            });
            expect(updatedGroups.length).toEqual(groupIds.length);
            expect(updatedGroups[0].users.length).toBeGreaterThanOrEqual(userIds.length);
            done();
        });
        it('move users to another groups', async (done) => {
            const groupId = "dac9145c-4f9a-457c-8a2b-2bdbac877c69";
            const groupIds = ["fd59640c-386a-47ad-98f1-faddf005512c"];
            const userIds = ["fb9b3999-23be-4a1b-891d-5e2af9066705", "cc1fb011-d2b6-45eb-8d2d-d048f1ead940", "41abd332-65cb-40ea-af70-87364d2d0ff2"];
            const updatedGroups = await APIClient.call<any>({
                facility: 'http',
                baseUrl: Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
                service: `v1.0/rbac/groups/${groupId}/move-users`,
                method: 'post',
                body: {
                    groupIds,
                    userIds
                },
                headers: { Authorization: `Bearer ${constantToken}` },
                debug: false,
            });
            expect(updatedGroups.length).toEqual(groupIds.length);
            expect(updatedGroups[0].users.length).toBeGreaterThanOrEqual(userIds.length);
            done();
        });
        it('update bulks users - override groups', async (done) => {
            const body = { 
                "userIds": 
                    [
                        "1fbffda4-2333-4f8e-827c-94442dc846e0", 
                        "20fca410-f870-44b8-8d0e-e527b31d89d1", 
                        "13ca8274-43e7-459f-ac16-5cf54d5c4b16"
                    ], 
                "overrideGroups": 
                    [
                        "fd59640c-386a-47ad-98f1-faddf005512c", 
                        "f67828ea-748f-45be-94aa-002aed09092f"
                    ], 
                "addGroups": [], 
                "removeGroups": [] 
            }
            const updatedUsers = await APIClient.call<any>({
                facility: 'http',
                baseUrl: Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
                service: `v1.0/rbac/groups/update-bulk-users`,
                method: 'post',
                body,
                headers: { Authorization: `Bearer ${constantToken}` },
                debug: false,
            });
            expect(updatedUsers.length).toEqual(body.userIds.length);
            expect(updatedUsers[0].groups.length).toBeGreaterThanOrEqual(body.overrideGroups.length);
            const user0GroupIds = updatedUsers[0].groups.map((g:any) => g.id);
            expect(user0GroupIds).toContain(body.overrideGroups[0]);
            done();
        });
        it('update bulks users - add and remove groups', async (done) => {
            const body = {
                "userIds":
                    [
                        "792d87bd-23be-4be4-9def-f971deb8d96b",
                        "38a668f9-8410-4702-92ee-feab58394f10",
                        "dc3639ac-d74c-4445-9441-c84a7ee6eb1a"
                    ],
                "overrideGroups":[],
                "addGroups":
                    [
                        "7ac02983-596c-4c96-9196-74e51a0fcc03",
                        "9b7805ff-3149-4608-812c-7f3f5e9c51c0"
                    ],
                "removeGroups":
                    [
                        "f702f5d7-b817-49ec-8ab2-87014743815e",
                        "8f8a22aa-0203-45b6-9555-6234819302f9"
                    ]
                };
            const updatedUsers = await APIClient.call<any>({
                facility: 'http',
                baseUrl: Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
                service: `v1.0/rbac/groups/update-bulk-users`,
                method: 'post',
                body,
                headers: { Authorization: `Bearer ${constantToken}` },
                debug: false,
            });
            expect(updatedUsers.length).toEqual(body.userIds.length);
            const user0GroupIds = updatedUsers[0].groups.map((g:any) => g.id);
            expect(user0GroupIds).toContain(body.addGroups[0]);
            expect(user0GroupIds).not.toContain(body.removeGroups[0]);
            done();
        });
    });
});
