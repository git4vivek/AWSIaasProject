const AWS = require('aws-sdk');
const promisePoller = require('promise-poller').default;
const uuid = require('uuid/v4');
const _ = require('lodash');

const REQUEST_QUEUE_URL = 'https://sqs.us-west-1.amazonaws.com/696521643480/RequestQueue';
const RESPONSE_QUEUE_URL = 'https://sqs.us-west-1.amazonaws.com/696521643480/ResponseQueue';

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
                            let rekMessage = JSON.parse(message['Body']);
                            console.log(rekMessage['uuid']);
                            console.log(rekMessage['label']);
                            if (rekMessage['uuid'] === this.job_uuid) {
                                console.log('Matching Job Found: ' + this.job_uuid);

                                sqs.deleteMessage({
                                    QueueUrl: RESPONSE_QUEUE_URL,
                                    ReceiptHandle: message['ReceiptHandle']
                                });

                                res(rekMessage);
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
            taskFn: this.waitForJobFinish.bind(this),
            interval: 1000, // milliseconds
            retries: 200
        });

        poller.then((result)=>{
            cb(null, result);
        }).catch((err)=>{
            cb(err, null);
            console.log(err);
        });
    }

    getRequest(cb){
        const sqs_params = {
            QueueUrl: REQUEST_QUEUE_URL, /* required */
            MaxNumberOfMessages: 1,
            MessageAttributeNames: [
                '.*',
                /* more items */
            ],
        };
        console.log('Reading the request queue');
        this.sqs.receiveMessage(sqs_params, (err, data)=>{
            if(err){
                cb(err);
                console.log(err);
            }else{
                if(_.isUndefined(data['Messages'])){
                    cb("No Requests");
                    return;
                }
                if(data['Messages'].length>0){
                    let job_uuid = data['Messages'][0]['Body'].toString();
                    cb(null, job_uuid);
                }else{
                    cb('No messages');
                }
            }
        })
    }

    addResults(videoname, job_uuid, labels, cb){
        const msgParams  = {
            MessageBody: JSON.stringify({
                video: videoname,
                uuid: job_uuid,
                label: labels
            }),
            QueueUrl: RESPONSE_QUEUE_URL
        };
        this.sqs.sendMessage(msgParams, (err, data)=>{
            if(err){
                console.log(err);
                cb(err,null);
            }else{
                cb(null,data);
            }
        });
    }

}

module.exports = SQSHandler;