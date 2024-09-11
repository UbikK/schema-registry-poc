import {  SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import Consul from 'consul';
import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';


class SchemaDrivenConsumer {
    private registry: SchemaRegistry
    private kafka: Kafka
    private consumer: Consumer
    private schemaId!: number
    private _isReady: boolean = false;
    private avroWatcher: any
    private consulInstance: Consul.Consul
    private schemaKey: string
    private topic: string
    
    public get isReady(): boolean {
      return this._isReady;
    }
   

    constructor(schemaKey: string, topic: string) {
        this.schemaKey = schemaKey
        this.topic = topic
        this.registry = new SchemaRegistry({ host: 'http://localhost:8085' });
        this.kafka = new Kafka({
            brokers: ['localhost:9092'],
            clientId: 'wizard_test',
          })
          this.consumer =  this.kafka.consumer({groupId: 'test-group'})

          this.consulInstance = new Consul();
          
          this.avroWatcher = this.consulInstance.watch({
              method: this.consulInstance.kv.get,
              options: {
                  key: schemaKey
              },
              backoffFactor: 1000,
          })
    }

    async init() {
        const schemaInfosObject = await this.consulInstance.kv.get(this.schemaKey) as any
        const schemaInfos = JSON.parse(schemaInfosObject.Value);
        console.log("🚀 ~ SchemaDrivenProducer ~ init ~ schemaInfos:", schemaInfos)
        
        this.schemaId = await this.registry.getRegistryId(schemaInfos.name, schemaInfos.version)
        
        await this.consumer.connect();
        this.consumer.subscribe({ topic:this.topic})
        this._isReady = true
        
        this.avroWatcher.on('change', async (data: any, res: any) => {
            console.log('avro data', data.Value ? JSON.parse(data.Value) : data)
            const value = JSON.parse(data.Value)

            this.schemaId = await this.registry.getRegistryId(value.name, value.version)
        }) 
    }

    run() {
        console.log("🚀 ~ SchemaDrivenConsumer ~ run ~ run:")
        
        this.consumer.run({
            eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
                const decodedMessage = {
                    ...message,
                    value: await this.registry.decode(message.value as Buffer)
                }
                console.log("🚀 ~ eachMessage: ~ decodedMessage:", decodedMessage.value)
            },
        
        })
    }
}

const init = async () => {
    const consumer = new SchemaDrivenConsumer('test', 'main_topic')
    
    await consumer.init();
    
    if (consumer.isReady) {
        consumer.run()
    }
}
    
init();