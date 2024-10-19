const dotenv = require('dotenv');
const { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { AwsS3Store } = require('wwebjs-aws-s3');

dotenv.config();

const config = {
    TIMEOUT_MS: process.env.TIMEOUT_MS || 15 * 60 * 1000, // 15 minutes
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
    USER_SESSION_PATH: 'user_session',
    AWS: {
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN
        },
        bucketName: process.env.BUCKET_NAME
    }
};

const s3Client = new S3Client(config.AWS);
const store = new AwsS3Store({
    bucketName: config.AWS.bucketName,
    remoteDataPath: 'sessions/',
    s3Client,
    putObjectCommand: PutObjectCommand,
    headObjectCommand: HeadObjectCommand,
    getObjectCommand: GetObjectCommand,
    deleteObjectCommand: DeleteObjectCommand
});

module.exports = { config, store };
