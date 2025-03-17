"use server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import {S3Client , PutObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
    region: process.env.AWS_BUCKET_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
})

export async function getSignedURL() {

    const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]

    const session = await auth.api.getSession({
        headers: await headers() 
    })
    if(!session){
        return {failure: "no esta autenficado"}
    }
    const putObjectCommand = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: "test-file",
    })
    

    const getSignedURL = await getSignedUrl(s3, putObjectCommand, {
        expiresIn: 60
    })
    console.log('success')
    return {success: {url:getSignedURL}}

}