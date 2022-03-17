import { HelpersIdentityApi } from '@d19n/client/dist/helpers/helpers.identity.api';
import dotenv from 'dotenv';

dotenv.config();

export class AuthUserHelper {

  public static async login(email:string|null, password: string|null): Promise<{ token: any }> {
    return new Promise((resolve, reject) => {
      HelpersIdentityApi.login<{ token: string }>(email?email:process.env.TEST_EMAIL, password?password:process.env.TEST_PASSWORD).subscribe(
        loginResponse => {
          if (!loginResponse.successful) {
            console.log(loginResponse);
          }
          return resolve(loginResponse.response);
        });
    });
  }

}
