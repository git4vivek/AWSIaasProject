## Python 3.7.2
## Required package: boto3

import threading, time
import boto3
from collections import deque

class AutoScaler:

    def __init__(self, inputQueueUrl, amiId, timeSlotDuration = 60, region = 'us-west-1'):
        self.inputQueueUrl = inputQueueUrl #  #the input queue
        self.amiId = amiId # 'ami-0e355297545de2f82'
        self.timeSlotDuration = timeSlotDuration #seconds
        self.region = region

        self.slots = deque([0, 0, 0, 0, 0])
        
        self.sqs = boto3.client('sqs', region_name=region)
        self.ec2 = boto3.resource('ec2', region_name=region)
        self.currentInstances = None

        ## start as bg thread
        # thread = threading.Thread(target=self.run, args=())
        # thread.daemon = True
        # thread.start()

        ## debug:
        self.run()

    def getCountOfMessagesInSQS(self):
        response = self.sqs.get_queue_attributes(
            QueueUrl=self.inputQueueUrl,
            AttributeNames=['ApproximateNumberOfMessages']
        )
        return int(response['Attributes']['ApproximateNumberOfMessages'])


    def getInstances(self, states=['running']):
        ## get currently running instances
        instances = self.ec2.instances.filter(
            Filters=[
                {
                    'Name': 'image-id',
                    'Values': [
                        self.amiId,
                    ]
                },
                {
                    'Name': 'instance-state-name',
                    'Values': states
                },
                {
                    'Name': 'tag:type',
                    'Values': ['app_instance']
                }
            ])
        
        instanceList = []
        for instance in instances:
            instanceList.append(instance.id)

        return instanceList


    def createInstances(self, count = 1):
        currentlyCreatingInstances = len(self.getInstances(states=['pending']))
        if currentlyCreatingInstances != count:
            instance = self.ec2.create_instances(
                ImageId = self.amiId,
                InstanceType = 't2.micro',
                MaxCount = count - currentlyCreatingInstances if count - currentlyCreatingInstances > 1 else 1,
                MinCount = 1,
                TagSpecifications=[
                    {
                        'ResourceType': 'instance',
                        'Tags': [
                            {
                                'Key': 'type',
                                'Value': 'app_instance'
                            }
                        ]
                    },
                ],
            )
            print ('creating ' + str(count) + ' new instances')
        else:
            print (str(count) + ' instances already started init')


    def startInstances(self, count = 1):
        currentlyCreatingInstances = len(self.getInstances(states=['pending']))
        if currentlyCreatingInstances < count:
            availableInstances = self.getInstances(states=['stopped'])
            availableInstances = availableInstances[:count - currentlyCreatingInstances]
            if len(availableInstances) > 0:
                self.ec2.instances.filter(InstanceIds = availableInstances).start()
            if count > len(availableInstances):
                createCount = count - len(availableInstances) if count - len(availableInstances) < 20 else 20
                self.createInstances(createCount)

    def stopInstances(self, count = 1):
        currentlyDeletingInstances = len(self.getInstances(states=['stopping']))
        if currentlyDeletingInstances != count:
            runningInstances = self.getInstances(states=['running'])
            runningInstances = runningInstances[:count-1]
            self.ec2.instances.filter(InstanceIds = runningInstances).stop()


    def run(self):
        while True:
            self.currentInstances = self.getInstances() # list of instance Ids currently running
            currentInstanceCount = len(self.currentInstances)
            currentMessageCount = self.getCountOfMessagesInSQS()

            self.slots.append(currentMessageCount)
            self.slots.popleft()
            mvMaxOfMessages = max(self.slots)

            print ("slots", self.slots)
            print ("mvMaxOfMessages", mvMaxOfMessages)
            print ("currentInstanceCount", currentInstanceCount)
            if mvMaxOfMessages > currentInstanceCount and currentInstanceCount < 20:
                ## initCreate
                instancesToCreate = mvMaxOfMessages - currentInstanceCount if mvMaxOfMessages - currentInstanceCount < 20 else 20
                print ("initiating creation/start of " + str(instancesToCreate) + " instances")
                #self.createInstances(instancesToCreate)
                self.startInstances(instancesToCreate)
            # elif mvMaxOfMessages < currentInstanceCount and currentInstanceCount > 1:
            #     ## initDelete
            #     instancesToDelete = currentInstanceCount - mvMaxOfMessages
            #     print ("initiating delete/stop of " + str(instancesToDelete) + " instances")
            #     #self.deleteInstances(instancesToDelete)
            #     self.stopInstances(instancesToDelete)
            else:
                ## do nothing
                print ("do nothing")

            print ('Waiting for ' + str(self.timeSlotDuration) + ' seconds')
            print ('')
            time.sleep(self.timeSlotDuration)

## debug
#a = AutoScaler(inputQueueUrl = 'https://us-west-1.queue.amazonaws.com/079683809430/scaler-test-q-1', dontDeleteQueueUrl = 'https://sqs.us-west-1.amazonaws.com/079683809430/scaler-dontdeleteq-2.fifo', amiId = 'ami-0de5566c453958f48', timeSlotDuration=10)

## PROD
a = AutoScaler(inputQueueUrl = 'https://sqs.us-west-1.amazonaws.com/696521643480/RequestQueue', amiId = 'ami-0c795c0bdb476da53', timeSlotDuration=60)
