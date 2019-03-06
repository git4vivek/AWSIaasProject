const http = require('http');
const AWS = require('aws-sdk');
const uuid = require('uuid');

const BUCKET_NAME = 'cse546project1';


class VideoHandler{
    constructor(video_name, response){
        this.video_name = video_name;
        // TODO store the video in the ephemeral disk
    }

    /**
     * Process the results using the app cluster
     * @param cb The callback function which uses the results
     */
    processVideo(cb){
        // TODO processing
        let results = 'object';

        // provide results to callback function
        cb(results);


    }

    uploadResults(results){
        let objectParams = {
            Bucket: BUCKET_NAME,
            Key: this.video_name,
            Body: results
        };

        let s3promise = new AWS.S3().putObject(objectParams).promise();
        s3promise.then(
            (data)=>{
                console.log(`Uploaded the results for the video ${this.video_name} in the S3 bucket ${BUCKET_NAME}`);
            }
        ).catch(
            (err)=>{
                console.error(err,err.stack);
            }
        )
    }

    static printHello(){
        console.log('Hello');
    }
}

module.exports = VideoHandler;