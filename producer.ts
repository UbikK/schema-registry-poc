import {  SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { Kafka, Producer } from 'kafkajs';
import Consul from 'consul';

class SchemaDrivenProducer {
    private producer: Producer
    private registry: SchemaRegistry
    private avroWatcher: any
    private schemaId!: number
    private _isReady: boolean = false;
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
        this.producer = new Kafka({
            brokers: ['localhost:9092'],
            clientId: 'wizard_test',
          }).producer()
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
        
        await this.producer.connect();
        
        this._isReady = true

          this.avroWatcher.on('change', async (data: any, res: any) => {
              console.log('avro data changed', data.Value ? JSON.parse(data.Value) : data)
              const value = JSON.parse(data.Value)
              this.schemaId = await this.registry.getRegistryId(value.name, value.version)
          })    
    }

    async produce(message: any) {
        console.log("🚀 ~ SchemaDrivenProducer ~ produce ~ message:", message)
        try {
          const encoded = await this.registry.encode(this.schemaId, message)
          await this.producer.send({topic:this.topic, messages: [{value: encoded, key: 'key'}]})
        }catch(e) {
            console.log("🚀 ~ SchemaDrivenProducer ~ produce ~ e:", e)
            return;
        }
    }
  
}

const init = async () => {
  const producer = new SchemaDrivenProducer('test', 'main_topic');

  await producer.init();

  if (producer.isReady) {
    producer.produce({fullName: 'toto', firstName: 'titi', address:'truc'})
  }
}

init();