const http = require('http');
const AWS = require('aws-sdk');
const uuid = require('uuid');



class VideoHandler{
    constructor(){

    }

    static printHello(){
        console.log('Hello');
    }
}

module.exports = VideoHandler;