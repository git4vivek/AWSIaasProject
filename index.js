const http = require('http');
const express =  require('express');
const _ = require('lodash');
const SQSHandler = require('./SQSHandler');

const VideoHandler = require('./VideoHandler');


const app = express();
const port = 80;


app.get('/', (req, res)=>{
    console.log("Putting a new request on the SQS");
    let sqsh = new SQSHandler();

    sqsh.createRequest().then(
        ()=>{
            sqsh.getResult((err, result)=>{
                if(err){
                    console.log(err);
                    res.send("Error: Failed Getting results");
                }else {
                    res.send(`${result['video']},${result['label']}`);
                    console.log(`Result: ${result}`);
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

let server = app.listen(port, ()=>{
    VideoHandler.printHello();

    console.log(`Started server at port ${port}`);
});

server.timeout = 99999999;
