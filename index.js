const http = require('http');
const express =  require('express');
const _ = require('lodash');

const VideoHandler = require('./VideoHandler');


const app = express();
const port = 3000;

const rpi_cluster_ip = '206.207.50.7';
const video_url = `http://${rpi_cluster_ip}/getvideo/`;


app.get('/', (req, res)=>{
    console.log("Getting video from the RPi cluster...");
    http.get(video_url, (vid_res)=>{
        console.log(vid_res);

        // Try to get filename from the video
        let content_disposition = vid_res.headers["content-disposition"];
        let content_disposition_kv = content_disposition.split(';').map((kv=>kv.trim().split('=')));

        let filename_kv = content_disposition_kv.filter((kv)=>{
            return kv[0].trim() === 'filename';
        })[0];

        let filename = filename_kv[1].split("\"").join("");


        let vh = new VideoHandler(filename, vid_res);

        // Send Video to app server for processing
        vh.processVideo((results)=>{
            // Send Results to client
            res.send(results);

            // Save Results on S3
            vh.uploadResults(results);

        });

        //res.send('boop');
    });

    //res.send("Hello");
});

app.listen(port, ()=>{
    VideoHandler.printHello();

    console.log(`Started server at port ${port}`);
});