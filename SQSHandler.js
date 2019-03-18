const AWS = require('aws-sdk');
const promisePoller = require('promise-poller');

const REQUEST_QUEUE_URL = 'https://sqs.us-west-1.amazonaws.com/204881055968/RequestQueue';
const RESPONSE_QUEUE_URL = 'https://sqs.us-west-1.amazonaws.com/204881055968/ResponseQueue';

class SQSHandler{
    constructor(){
        this.sqs = new AWS.SQS({region: 'us-west-1'});
    }

    createRequest(videoName){
        let createParams = {
            MessageBody: videoName,
            QueueUrl: REQUEST_QUEUE_URL,

        };

        return new Promise((res, rej) => {
            this.sqs.sendMessage(createParams, (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    res(data);
                }
            })
        });
    }

    getResult(videoName){
        let findResponse = ()=>{

        }

    }

}

module.exports = SQSHandler;