const http = require('http');
const AWS = require('aws-sdk');
//const uuid = require('uuid');
const fs = require('fs');
const _ = require('lodash');
const promisePoller = require('promise-poller').default

const BUCKET_NAME = 'cse546project1rek';
const SNS_ROLE = 'arn:aws:iam::204881055968:role/MySNSRole';
const SNS_TOPIC = 'arn:aws:sns:us-west-2:204881055968:AmazonRekognition_CSE546';
const SQS_QUEUE_URL= 'https://sqs.us-west-2.amazonaws.com/204881055968/ObjectDetection';



class VideoDetect{
    constructor(video_name){
        this.options = {
            jobId : '',
            queueUrl: SQS_QUEUE_URL,
            roleArn: SNS_ROLE,
            topicArn: SNS_TOPIC,
            bucket: BUCKET_NAME,
            video: video_name
        };
        this.rek = new AWS.Rekognition({region: 'us-west-2'});
    }

    main(){
        let params = {
            Video: { /* required */
                S3Object: {
                    Bucket: this.options.bucket,
                    Name: this.options.video,
                }
            },
            NotificationChannel: {
                RoleArn: this.options.roleArn, /* required */
                SNSTopicArn: this.options.topicArn /* required */
            }
        };

        this.rek.startLabelDetection(params, (err, data) => {
            if(err){
                console.error(err, err.stack);
            }else{
                this.jobId = data['JobId'];
                console.log(`Started Rekognition job with JobID: ${this.jobId}`);
                this.pollResults();
            }
        });

    }

    waitForJobFinish(cb){
        const sqs = new AWS.SQS({region: 'us-west-2'});

        const sqs_params = {
            QueueUrl: this.options.queueUrl, /* required */
            MaxNumberOfMessages: 10,
            MessageAttributeNames: [
                '.*',
                /* more items */
            ],
        };

        return new Promise((res, rej)=>{
            sqs.receiveMessage(sqs_params, (err, data) => {
                if(err){
                    console.log('Failed to receive sqs message');
                    rej(err);
                }else{
                    if(_.isNil(data['Messages'])){
                        rej();
                    }
                    data['Messages'].forEach((message)=>{
                        try {
                            let notification = JSON.parse(message['Body']);
                            let rekMessage = JSON.parse(notification['Message']);
                            console.log(rekMessage['JobId']);
                            console.log(rekMessage['Status']);
                            if (rekMessage['JobId'] === this.jobId) {
                                console.log('Matching Job Found: ' + this.jobId);

                                sqs.deleteMessage({
                                    QueueUrl: this.options.queueUrl,
                                    ReceiptHandle: message['ReceiptHandle']
                                });

                                res();
                            } else {
                                rej();
                                console.log(`Job did't match: ${rekMessage['JobId']}:${this.jobId}`);
                            }

                            sqs.deleteMessage({
                                QueueUrl: this.options.queueUrl,
                                ReceiptHandle: message['ReceiptHandle']
                            });
                        }catch (e) {
                            console.log('Read irrelevant message');
                            rej();
                        }
                    })
                }
            });

        });

    }

    pollResults(dotLine=0){
        const sqs = new AWS.SQS({region: 'us-west-2'});
        let jobFound = false;
        const sqs_params = {
            QueueUrl: this.options.queueUrl, /* required */
            MaxNumberOfMessages: 10,
            MessageAttributeNames: [
                '.*',
                /* more items */
            ],
        };

        let jobFoundPromise = new Promise((res, rej)=>{
            sqs.receiveMessage(sqs_params, (err, data) => {
                if(err){
                    console.log('Failed to receive sqs message');
                    rej(err);
                }else{
                    let prompt = '';
                    if(_.isNil(data['Messages'])){
                        if(dotLine<20){
                            prompt += '.';
                            dotLine++;
                        }else{
                            prompt += '\n';
                            dotLine = 0;
                        }
                        console.log(prompt);
                        return;
                    }
                    data['Messages'].forEach((message)=>{
                        try {
                            let notification = JSON.parse(message['Body']);
                            let rekMessage = JSON.parse(notification['Message']);
                            console.log(rekMessage['JobId']);
                            console.log(rekMessage['Status']);
                            if (rekMessage['JobId'] === this.jobId) {
                                console.log('Matching Job Found: ' + this.jobId);
                                jobFound = true;

                                this.getResultsLabels();

                                sqs.deleteMessage({
                                    QueueUrl: this.options.queueUrl,
                                    ReceiptHandle: message['ReceiptHandle']
                                });
                            } else {
                                console.log(`Job did't match: ${rekMessage['JobId']}:${this.jobId}`);
                            }

                            sqs.deleteMessage({
                                QueueUrl: this.options.queueUrl,
                                ReceiptHandle: message['ReceiptHandle']
                            });
                        }catch (e) {
                            console.log('Read irrelevant message');
                        }
                    })
                }

                if(!jobFound){
                    this.pollResults(dotLine);
                }
            });
        });

    }

    getResultsLabels(){
        let maxResults = 10;
        let paginationToken = '';
        let finished = false;

        while(!finished){
            this.rek.getLabelDetection({
                JobId: this.jobId,
                MaxResults: maxResults,
                NextToken: paginationToken,
                SortBy: "TIMESTAMP"
            }, (err, data)=>{
                console.log(data['VideoMetadata']['Codec']);
                console.log(data['VideoMetadata']['DurationMillis'].toString());
                console.log(data['VideoMetadata']['Format']);
                console.log(data['VideoMetadata']['FrameRate']);

                data['Labels'].forEach((labelDetection)=>{

                    let label=labelDetection['Label'];

                    console.log("Timestamp: " + labelDetection['Timestamp'].toString());
                    console.log("   Label: " + label['Name']);
                    console.log("   Confidence: " +  label['Confidence'].toString());
                    console.log("   Instances:");

                    label['Instances'].forEach((instance)=>{
                        console.log ("      Confidence: " + instance['Confidence'].toString());
                        console.log ("      Bounding box");
                        console.log ("        Top: " + instance['BoundingBox']['Top'].toString());
                        console.log ("        Left: " + instance['BoundingBox']['Left'].toString());
                        console.log ("        Width: " +  instance['BoundingBox']['Width'].toString());
                        console.log ("        Height: " +  instance['BoundingBox']['Height'].toString());
                        console.log();
                    });
                    console.log();
                    console.log("   Parents:");
                    label['Parents'].forEach((parent)=>{
                        console.log("      " + parent['Name']);
                    });
                    console.log();

                    if(!_.isNil(data['NextToken'])){
                        paginationToken = data['NextToken'];
                    }else{
                        finished = true;
                    }

                });
            });


        }
    }
}


class VideoHandler{
    constructor(video_name, response){
        this.video_name = video_name;
        this.response = response;
        // TODO store the video in the ephemeral disk

        this.file_stored_promise = new Promise((res, rej) => {
            let local_file_path = `videos/${video_name}`;
            this.local_file = fs.createWriteStream(local_file_path);
            response.pipe(this.local_file);
            this.local_file.on('finish', ()=>{
                this.local_file.close();
                res(local_file_path);
            });

            this.local_file.on('error', (err)=>{
                rej(err);
            });
        });
    }

    static detectVideo(video_name){
        let vd = new VideoDetect(video_name);
        vd.main();
    }

    /**
     * Process the results using the app cluster
     * @param cb The callback function which uses the results
     */
    processVideo(cb){
        const {execFile} = require('child_process');
        let file_convert_promise = (local_video)=>{
          return new Promise((res, rej)=>{
              execFile('ffmpeg',['-i',local_video,local_video+'.mp4','-y'],(err,sout,serr)=>{
                  if(err){
                      console.log(err);
                      rej(err);
                  }else{
                      res(local_video+'.mp4');
                  }
              });
          });
        };

        // Process the entire response
        this.file_stored_promise.then((local_file_path)=>{
            // TODO processing

            // Convert to mp4
            file_convert_promise(local_file_path).then((mp4_video_path)=>{

                // Store video in S3

                let file_read_stream = fs.createReadStream(mp4_video_path);

                let s3VideoParams = {
                    Bucket: BUCKET_NAME,
                    Key: local_file_path,
                    Body: file_read_stream,
                };
                let s3promise = new AWS.S3().putObject(s3VideoParams).promise();
                s3promise.then(
                    (data)=>console.log(`The video ${local_file_path} was uploaded to S3`)
                ).catch(
                    (err)=>{
                        console.error(err,err.stack);
                    }
                );


                let results = 'object';

                // provide results to callback function
                cb(results);

            }).catch((err)=>{
                console.log(err);
            });
        });




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