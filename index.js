const http = require('http');
const express =  require('express');
const _ = require('lodash');
const SQSHandler = require('./SQSHandler');

const VideoHandler = require('./VideoHandler');


const app = express();
const port = 3000;

const rpi_cluster_ip = '206.207.50.7';



app.get('/', (req, res)=>{
    console.log("Putting a new request on the SQS");
    let sqsh = new SQSHandler();

    sqsh.createRequest().then(
        (data)=>{
            sqsh.getResult((err, result)=>{
                if(err){
                    console.log(err);
                    res.send("Error: Failed Getting results");
                }else {
                    res.send(result['label']);
                    console.log(`Result: ${result}`);
                    let vh = new VideoHandler(result['video'], null);
                    vh.uploadResults(result['label']);
                }
            });
        }
    ).catch(
        (err)=>{
            res.send("Error: SQS failure");
            console.log("Failed to create an SQS request");
            console.log(err);
        }
    );
});

app.listen(port, ()=>{
    VideoHandler.printHello();

    console.log(`Started server at port ${port}`);
});