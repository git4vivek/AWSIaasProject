const AWS = require('aws-sdk');
const promisePoller = require('promise-poller');
const uuid = require('uuid/v4');

const REQUEST_QUEUE_URL = 'https://sqs.us-west-1.amazonaws.com/204881055968/RequestQueue';
const RESPONSE_QUEUE_URL = 'https://sqs.us-west-1.amazonaws.com/204881055968/ResponseQueue';

class SQSHandler{
    constructor(){
        this.sqs = new AWS.SQS({region: 'us-west-1'});
    }

    waitForJobFinish(){
        const sqs = this.sqs;

        const sqs_params = {
            QueueUrl: RESPONSE_QUEUE_URL, /* required */
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
                        rej('No messages');
                        return;
                    }
                    data['Messages'].forEach((message)=>{
                        try {
                            let notification = JSON.parse(message['Body']);
                            let rekMessage = notification;
                            console.log(rekMessage['uuid']);
                            console.log(rekMessage['label']);
                            if (rekMessage['uuid'] === this.job_uuid) {
                                console.log('Matching Job Found: ' + this.job_uuid);

                                sqs.deleteMessage({
                                    QueueUrl: RESPONSE_QUEUE_URL,
                                    ReceiptHandle: message['ReceiptHandle']
                                });

                                res(rekMessage['label']);
                            } else {
                                rej('wrong job id');
                                console.log(`Job did't match: ${rekMessage['JobId']}:${this.job_uuid}`);
                            }

                            sqs.deleteMessage({
                                QueueUrl: RESPONSE_QUEUE_URL,
                                ReceiptHandle: message['ReceiptHandle']
                            });
                        }catch (e) {
                            //console.log('Read irrelevant message');
                            rej(e);
                        }
                    })
                }
            });

        });

    }

    createRequest(){
        const request_uuid = uuid();
        this.job_uuid = request_uuid;
        let createParams = {
            MessageBody: request_uuid,
            QueueUrl: REQUEST_QUEUE_URL,
        };

        return new Promise((res, rej) => {
            this.sqs.sendMessage(createParams, (err, data) => {
                if (err) {
                    rej(err);
                } else {
                    res({
                        uuid: request_uuid,
                        data: data
                    });
                }
            });
        });
    }

    getResult(cb){
        let poller = promisePoller({
            taskFn: this.waitForJobFinish().bind(this),
            interval: 1000, // milliseconds
            retries: 200
        });

        poller.then((result)=>{
            cb(result);
        }).catch((err)=>{
            cb('Polling for results failed');
            console.log(err);
        });
    }

}

module.exports = SQSHandler;