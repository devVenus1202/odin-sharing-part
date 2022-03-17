// Load the SDK for JavaScript
// import S3 from 'aws-sdk/clients/s3';
// import entire SDK
// import individual service
import S3 from 'aws-sdk/clients/s3';
// import AWS object without services
import AWS from 'aws-sdk/global';
import * as dotenv from 'dotenv';
import { S3BucketCreateDto } from './types/bucket.create.dto';

dotenv.config({ path: '../../../../.env' });

// Set the region
AWS.config.update({
    region: 'eu-west-2',
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
});

/**
 *
 * @param body
 */
export async function createBucket(body: S3BucketCreateDto): Promise<any> {

    return new Promise((resolve, reject) => {

        // Set the region dynamically based on the organizations AWS_REGION
        AWS.config.update({ region: 'eu-west-2' });
        // Create S3 service object
        const s3 = new S3({ apiVersion: '2006-03-01' });

        // Create the parameters for calling createBucket
        const bucketParams = {
            Bucket: body.bucketName,
        };

        // call S3 to create the bucket
        s3.createBucket(bucketParams, function (err, data) {
            if(err) {
                console.log('Error', err);
                return reject(err);
            } else {
                console.log('Success', data);
                return resolve(data);
            }
        });
    });

}

/**
 *
 * @param principal
 * @param bucketName
 */
export async function listBucketObjects(
    bucketName: string,
    pathName: string,
): Promise<any> {

    return new Promise((resolve, reject) => {

        // Set the region dynamically based on the organizations AWS_REGION
        AWS.config.update({ region: 'eu-west-2' });
        // Create S3 service object
        const s3 = new S3({ apiVersion: '2006-03-01' });

        // Create the parameters for calling listObjects
        const bucketParams = {
            Bucket: bucketName,
            Prefix: pathName,
            MaxKeys: 10000,
        };

        // Call S3 to obtain a list of the objects in the bucket
        s3.listObjects(bucketParams, function (err, data) {
            if(err) {
                console.log('Error', err);
                return reject(err);
            } else {
                console.log('Success', data);
                return resolve(data);
            }
        });
    });
}

/**
 *
 * @param principal
 * @param bucketName
 * @param pathName
 * @param body
 */
export async function putObjectToS3(
    bucketName: string,
    pathName: string,
    body: any,
): Promise<any> {

    return new Promise((resolve, reject) => {
        // Set the region dynamically based on the organizations AWS_REGION
        AWS.config.update({ region: 'eu-west-2' });
        // Create S3 service object
        const s3 = new S3({ apiVersion: '2006-03-01' });

        // Create the parameters for calling listObjects
        const bucketParams = {
            Bucket: bucketName,
            Key: pathName,
            Body: body,
        };

        // Call S3 to obtain a list of the objects in the bucket
        s3.putObject(bucketParams, function (err, data) {
            if(err) {
                console.log('Error', err);
                return reject(err);
            } else {
                console.log('Success', data);
                return resolve(data);
            }
        });
    });
}

/**
 *
 * @param principal
 * @param bucketName
 * @param pathName
 * @param body
 */
export async function deleteObjectFromS3(
    bucketName: string,
    pathName: string,
): Promise<any> {

    return new Promise((resolve, reject) => {
        // Set the region dynamically based on the organizations AWS_REGION
        AWS.config.update({ region: 'eu-west-2' });
        // Create S3 service object
        const s3 = new S3({ apiVersion: '2006-03-01' });

        // Create the parameters for calling listObjects
        const bucketParams = {
            Bucket: bucketName,
            Key: pathName,
        };

        // Call S3 to obtain a list of the objects in the bucket
        s3.deleteObject(bucketParams, function (err, data) {
            if(err) {
                console.log('Error', err);
                return reject(err);
            } else {
                console.log('Success', data);
                return resolve(data);
            }
        });
    });
}


/**
 *
 * @param bucketName
 * @param pathName
 * @param action
 * @param expires
 */
export async function getPresignedUrl(
    bucketName: string,
    pathName: string,
    action: string = 'getObject',
    expires: number = 86400,
): Promise<any> {
    const s3 = new S3({ signatureVersion: 'v4' });
    const params = {
        Bucket: bucketName,
        Key: pathName,
        Expires: expires, // In seconds
    };
    return await s3.getSignedUrl(action, params);
}


