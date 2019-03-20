const http = require('http');
const AWS = require('aws-sdk');
//const uuid = require('uuid');
const fs = require('fs');

const rpi_cluster_ip = '206.207.50.7';

const video_url = `http://${rpi_cluster_ip}/getvideo/`;
const BUCKET_NAME = 'cse546project1';


class VideoHandler{
    constructor(){
        // TODO store the video in the ephemeral disk
    }

    downloadVideo(cb){
        console.log("Getting video from the RPi cluster...");
        http.get(video_url, (vid_res)=>{

            // Try to get filename from the video
            let content_disposition = vid_res.headers["content-disposition"];
            let content_disposition_kv = content_disposition.split(';').map((kv=>kv.trim().split('=')));

            let filename_kv = content_disposition_kv.filter((kv)=>{
                return kv[0].trim() === 'filename';
            })[0];

            let filename = filename_kv[1].split("\"").join("");
            let file_stored_promise = new Promise((res, rej) => {
                let local_file_path = `videos/${filename}`;
                this.local_file = fs.createWriteStream(local_file_path);
                vid_res.pipe(this.local_file);
                this.local_file.on('finish', ()=>{
                    this.local_file.close();
                    res(local_file_path);
                });

                this.local_file.on('error', (err)=>{
                    rej(err);
                });
            });

            file_stored_promise.then((localPath)=>{
                cb(null, localPath);
            }).catch((err)=>{
                console.log(err);
                cb(err);
            })


            //res.send('boop');
        });
    }

    /**
     * Process the results using the app cluster
     * @param cb The callback function which uses the results
     */
    processVideo(cb){


        // Process the entire response
        this.file_stored_promise.then((local_file_path)=>{
            // TODO processing
            let results = 'object';

            // provide results to callback function
            cb(results);
        });




    }

    uploadResults(video_name, results){
        let objectParams = {
            Bucket: BUCKET_NAME,
            Key: video_name,
            Body: results
        };

        let s3promise = new AWS.S3().putObject(objectParams).promise();
        s3promise.then(
            (data)=>{
                console.log(`Uploaded the results for the video ${video_name} in the S3 bucket ${BUCKET_NAME}`);
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