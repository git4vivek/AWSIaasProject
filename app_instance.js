const promisePoller = require('promise-poller').default;
const fs = require('fs');
const SQSHandler = require('./SQSHandler');
const VideoHandler = require('./VideoHandler');


const sqsh = new SQSHandler();


function findAndProcessRequests(){
    // Look for things in SQS
    sqsh.getRequest((request_err, request_data)=>{
        if(!request_err){
            let uuid = request_data;
            // If request is found
            let vh = new VideoHandler();
            vh.downloadVideo((videoname)=>{

            })

            // Get video from Raspberry Pi
            // Call darknet script
            // Add the results to SQS(videoname, uuid, labels)

        }
    })

}

function main(){
    setInterval(findAndProcessRequests, 1000);
}