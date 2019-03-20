const fs = require('fs');
const SQSHandler = require('./SQSHandler');
const VideoHandler = require('./VideoHandler');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const _ = require('lodash');


const sqsh = new SQSHandler();

const MAX_PROCESSES = 2;
var num_processing = 0;

async function getLabels(video_path){
    let {stdout, stderr} = await exec('cd ~/darknet/ && xvfb-run -a ./darknet detector demo ./cfg/coco.data ' +
        './cfg/yolov3-tiny.cfg ./yolov3-tiny.weights ' +
        '../CSE546Project1/' +
        video_path +
        '  -dont_show');

    console.log(stderr);
    return stdout;
}

function findAndProcessRequests(){
    if(num_processing>=MAX_PROCESSES){
        return;
    }else{
        num_processing++;
    }
    // Look for things in SQS
    sqsh.getRequest((request_err, request_data)=>{
        if(!request_err){
            let uuid = request_data;
            // If request is found
            let vh = new VideoHandler();
            // Get video from Raspberry Pi

            vh.downloadVideo((err, video_path)=>{
                if(!err) {

                    // Call darknet script
                    let raw_output = getLabels(video_path);
                    raw_output.then((ro)=>{
                        // Processing of input is done
                        let formatted_labels = _.uniq(
                            raw_output.toString().split("\n")
                                .filter((line) => line.indexOf('%') !== -1)
                                .map((item) => item.split(':')[0])
                        ).join();

                        if (raw_output.toString().split("\n")
                            .filter((line) => line.indexOf('%') !== -1).length === 0) {
                            formatted_labels = "No item is detected";
                        }

                        // Add the results to SQS(videoname, uuid, labels)
                        sqsh.addResults(video_path.split('videos/').join(''), uuid, formatted_labels);

                        // Delete temp video
                        fs.unlink(video_path, (err)=>{
                           if(err){
                               console.log(err);
                           }
                        });

                    }).catch((err)=>{
                        console.log(err);
                    }).finally(()=>{
                        num_processing--;
                    });
                }else{
                    num_processing--;
                }
            })
        }else{
            num_processing--;
        }
    })

}

function main(){
    setInterval(findAndProcessRequests, 1000);
}

main();