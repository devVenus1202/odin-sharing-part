import { OrganizationUserEntity } from '@d19n/models/dist/identity/organization/user/organization.user.entity';
import { APIClient } from "@d19n/client/dist/common/APIClient";
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationUsersService } from './organizations.users.service';
import { OrganizationUserEntityLoginHistoryService } from './authentication/organizations.users.authentication.login.history.service';
import { OrganizationUserEntitysController } from './organizations.users.controller';
import { Utilities } from "@d19n/client/dist/helpers/Utilities";
import { SERVICE_NAME } from "@d19n/client/dist/helpers/Services";
import { JWTResponse } from '../../utilities/JWTResponse';
import { AuthUserHelper } from '../../helpers/AuthUserHelper';

export type MockType<T> = {
    [P in keyof T]?: jest.Mock<{}>;
};

export const mockRepository = jest.fn(() => ({
    metadata: {
        columns: [],
        relations: [],
    },
}));

jest.setTimeout(30000);
describe('OrganizationsUsersController', () => {
    let controller: OrganizationUserEntitysController;
    let userService: OrganizationUsersService;
    let repositoryMock: MockType<Repository<OrganizationUserEntity>>;
    let app: TestingModule;
    let principal: OrganizationUserEntity;
    let authToken: string;
    beforeAll(async () => {
        app = await Test.createTestingModule({
            controllers: [OrganizationUserEntitysController],
            providers: [
                {
                    provide: OrganizationUsersService,
                    useValue: {
                        getMyProfile: jest.fn(),
                        completeRegistration: jest.fn(),
                        deleteByPrincipalAndId: jest.fn()
                    },
                },
                {
                    provide: OrganizationUserEntityLoginHistoryService,
                    useValue: {

                    }
                }
            ],
        }).compile();
        userService = app.get<OrganizationUsersService>(OrganizationUsersService);
        controller = app.get<OrganizationUserEntitysController>(OrganizationUserEntitysController)
    });

    describe('create external user with contactId', () => {
        it('should create a new user with contactId, login and delete', async (done) => {

            // Create new User
            const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJvYmVydEBjYW1wYW55b24uY29tIiwicm9sZUlkIjoiMWRlNGZjZGItNjNjYi00ZTI2LTkxNzEtOTQ4NjQyYzdkODgwIiwib3JnYW5pemF0aW9uSWQiOiI3MTIzMWIzZS03OTk2LTQ3NGUtYTY2Yi0yZGMyYmE5MDc3OTkiLCJpYXQiOjE2MzE3MjQ4ODEsImV4cCI6MTYzMjMyOTY4MX0.ePsm0rIQnwATgNc4LeVuelu0mSRolhSVOqaZFqu7a1Q";
            const testNewUserData = {
                firstname: "Tester",
                lastname: "Odin",
                password: "12345678",
                confirmPassword: "12345678",
                contactId: "4ddfd6bb-6d02-4c56-adfc-615734e7e57c"
            }
            const res = await APIClient.call<OrganizationUserEntity>({
                facility: 'http',
                baseUrl: Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
                service: `v1.0/users/complete-registration/${testToken}`,
                method: 'post',
                headers: {},
                debug: false,
                body: testNewUserData
            });
            principal = res;
            expect(principal.contactId).toEqual(testNewUserData.contactId);


            // login with new User
            const loginTestData = {
                email: principal.email,
                password: "12345678"
            }
            const loginResponse = await AuthUserHelper.login(loginTestData.email, loginTestData.password);
            authToken = loginResponse.token;
            userService.deleteByPrincipalAndId(principal, principal.id)
            expect(loginResponse.token).not.toBeNull();


            // delete created user
            const adminLoginResponse = await AuthUserHelper.login(null, null);
            const deletedResponse = await APIClient.call<any>({
                facility: 'http',
                baseUrl: Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
                service: `v1.0/users/${principal.id}`,
                method: 'delete',
                headers: { Authorization: `Bearer ${adminLoginResponse.token}` },
                debug: false,
            });
            expect(deletedResponse.affected).toEqual(1);

            done();
        });
    });

    describe('create internal user  without contactId', () => {
        it('should create a new user without contactId', async (done) => {
            const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJvYmVydEBjYW1wYW55b24uY29tIiwicm9sZUlkIjoiMWRlNGZjZGItNjNjYi00ZTI2LTkxNzEtOTQ4NjQyYzdkODgwIiwib3JnYW5pemF0aW9uSWQiOiI3MTIzMWIzZS03OTk2LTQ3NGUtYTY2Yi0yZGMyYmE5MDc3OTkiLCJpYXQiOjE2MzE3MjQ4ODEsImV4cCI6MTYzMjMyOTY4MX0.ePsm0rIQnwATgNc4LeVuelu0mSRolhSVOqaZFqu7a1Q";
            const testNewUserData = {
                firstname: "Tester",
                lastname: "Odin",
                password: "12345678",
                confirmPassword: "12345678",
            }
            const res = await APIClient.call<OrganizationUserEntity>({
                facility: 'http',
                baseUrl: Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
                service: `v1.0/users/complete-registration/${testToken}`,
                method: 'post',
                headers: {},
                debug: false,
                body: testNewUserData
            });
            principal = res;
            expect(principal.contactId).toBeNull();

            const testLoginData = {
                email: principal.email,
                password: "12345678"
            }
            const loginResponse = await AuthUserHelper.login(testLoginData.email, testLoginData.password);
            authToken = loginResponse.token;
            userService.deleteByPrincipalAndId(principal, principal.id)
            expect(loginResponse.token).not.toBeNull();

            const adminLoginResponse = await AuthUserHelper.login(null, null);
            const deletedResponse = await APIClient.call<any>({
                facility: 'http',
                baseUrl: Utilities.getBaseUrl(SERVICE_NAME.IDENTITY_MODULE),
                service: `v1.0/users/${principal.id}`,
                method: 'delete',
                headers: { Authorization: `Bearer ${adminLoginResponse.token}` },
                debug: false,
            });
            expect(deletedResponse.affected).toEqual(1);
            done();
        });
    });
});
