const http = require('http');
const express =  require('express');
const AWS = require('aws-sdk');


const app = express();
const port = 80;

const lambda = new AWS.Lambda({region: 'us-west-2'});
const lambda_params = {
    FunctionName: "RekVideo"
};

app.get('/', (req, res)=>{
    lambda.invoke(lambda_params, (err,data)=>{
        if(err){
            console.log(err);
            res.send(err.toString());
        }else{
            console.log(data);
            res.send(JSON.parse(data['Payload'])['body']);
        }
    });
});

app.listen(port, ()=>{
    console.log(`Started server at port ${port}`);
});