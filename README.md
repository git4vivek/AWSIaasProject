# CSE 546 Project 1

## Configuration

1. Install node/npm
2. Store AWS credentials in `~/.aws/credentials` file

Example of credentials file:
```
[default]
aws_access_key_id = <YOUR_ACCESS_KEY_ID>
aws_secret_access_key = <YOUR_SECRET_ACCESS_KEY>
```

## Installation
The following command will install all dependancies:
```
npm install
```

## Running 
You can use the following command to start the server
```
npm start
```

By default, the server runs on port 3000. You can send a request using the following url:
```
http://localhost:3000/
```

The response will contain the label of the video

