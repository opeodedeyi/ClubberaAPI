require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const AWS = require('@aws-sdk/client-s3');


const s3 = new AWS.S3Client({
    credentials:
        {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        }
});


const uploadToS3 = async (base64data, filename) => {
    const uniqueFilename = `${uuidv4()}-${filename}`;

    // Convert the base64-encoded data to a buffer
    const base64Data = base64data.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Extract the mimeType from the base64 data
    const mimeType = base64data.split(',')[0].split(':')[1].split(';')[0];


    const params = {
        Bucket: process.env.VITE_APP_AWS_BUCKET_NAME,
        Key: uniqueFilename,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read'
    };

    const command = new AWS.PutObjectCommand(params)

    try {
        const data = await s3.send(command);
        console.log(`Image uploaded successfully at ${data} location - ${data.Location} key - ${uniqueFilename}`);
        return data;
    } catch (error) {
        console.log(`Failed to upload image to S3: ${error}`);
    }
};

module.exports = {
    uploadToS3
};
