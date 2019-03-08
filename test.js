

function test_rekognition(){
    let VideoHandler = require('./VideoHandler');
    VideoHandler.detectVideo('videos/video-pie1-054326.h264');
}

function test_sqs(){
    const http = require('http');
    const AWS = require('aws-sdk');
    const fs = require('fs');
    const _ = require('lodash');

    const BUCKET_NAME = 'cse546project1rek';
    const SNS_ROLE = 'arn:aws:iam::204881055968:role/MySNSRole';
    const SNS_TOPIC = 'arn:aws:sns:us-west-2:204881055968:AmazonRekognition_CSE546';
    const SQS_QUEUE_URL= 'https://sqs.us-west-2.amazonaws.com/204881055968/ObjectDetection';

    const sqs = new AWS.SQS({region: 'us-west-2'});

    let sqs_params = {
        QueueUrl: SQS_QUEUE_URL, /* required */
        MaxNumberOfMessages: 10,
        MessageAttributeNames: [
            'All',
        ],
    };

    sqs.receiveMessage(sqs_params, (err,data)=>{
       console.log(err);
       console.log(data);
    });


}

//test_sqs();
test_rekognition();