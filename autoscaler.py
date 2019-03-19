# keep track of count messages in slots of 1 minute for the past 5 mins
# get max of the last 5 slots
# if max > curr, create. 
# if max < curr, delete.
# 

import time
import boto3
from collections import deque

inputQueueUrl = 'https://us-west-1.queue.amazonaws.com/079683809430/scaler-test-q-1' #the input queue
dontDeleteQueueUrl = '' 
amiId = 'ami-0e355297545de2f82' #update with our AMI
timeSlotDuration = 10 #seconds
region = 'us-west-1'

slots = deque([0, 0, 0, 0, 0])

def getCountOfMessagesInSQS():
    sqs = boto3.client('sqs', region_name=region)

    response = sqs.get_queue_attributes(
        QueueUrl=inputQueueUrl,
        AttributeNames=['ApproximateNumberOfMessages']
    )

    return int(response['Attributes']['ApproximateNumberOfMessages'])

def getInstances():
    # get currently running instances
    ec2 = boto3.resource('ec2', region_name=region)
    instances = ec2.instances.filter(
        Filters=[
            {
                'Name': 'image-id',
                'Values': [
                    amiId,
                ]
            },
            {
                'Name': 'instance-state-name',
                'Values': [
                    'running',
                ]
            }
        ])
    
    instanceList = []
    for instance in instances:
        instanceList.append(instance.id)

    return instanceList

def createInstances(count = 1):
    ## may need to set up VPC and SG
    ec2 = boto3.resource('ec2', region_name='us-west-1')
    instance = ec2.create_instances(
        ImageId=amiId,
        InstanceType='t2.micro',
        MaxCount=count,
        MinCount=1
    )
 

def getInstancesToDelete(currentInstances = None):
    #talk to DontDeleteQ
    #return instances not in DontDeleteQ
    s = 1

    if currentInstances == None:
        currentInstances = getInstances()
    
    return currentInstances


def deleteInstances(currentInstances, count):
    instanceList = getInstancesToDelete(currentInstances)
    instanceList = instanceList[:count]
    print ("instances to delete: ", instanceList)
    ec2 = boto3.resource('ec2', region_name=region)
    ec2.instances.filter(InstanceIds = instanceList).terminate()

while True:
    currentInstances = getInstances() # list of instance Ids currently running
    currentInstanceCount = len(currentInstances)
    currentMessageCount = getCountOfMessagesInSQS()

    slots.append(currentMessageCount)
    slots.popleft()
    mvMaxOfMessages = max(slots)

    print ("slots", slots)
    print ("mvMaxOfMessages", mvMaxOfMessages)
    print ("currentInstanceCount", currentInstanceCount)
    if mvMaxOfMessages > currentInstanceCount:
        #initCreate
        instancesToCreate = mvMaxOfMessages - currentInstanceCount if mvMaxOfMessages - currentInstanceCount < 20 else 20
        createInstances(instancesToCreate)
        print ("initiating creation of " + str(instancesToCreate) + " instance")
    elif currentInstanceCount > mvMaxOfMessages:
        #initDelete
        instancesToDelete = currentInstanceCount - mvMaxOfMessages
        print ("initiating delete of " + str(instancesToDelete) + " instances here")
        deleteInstances(currentInstances, instancesToDelete)
    else:
        print ("do nothing")

    print ('Waiting for ' + str(timeSlotDuration) + ' seconds')
    print ('')
    time.sleep(timeSlotDuration)