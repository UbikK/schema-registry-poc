import consul from 'consul'
const instance = new consul()
export const jsonwatcher = instance.watch({
    method: instance.kv.get,
    options: {
        key: 'bid_json'
    },
    backoffFactor: 1000,
})

export const avroWatcher = instance.watch({
    method: instance.kv.get,
    options: {
        key: 'bid_avro'
    },
    backoffFactor: 1000,
})

// avroWatcher.on('change', (data, res) => {
//     console.log('avro data', data.Value ? JSON.parse(data.Value) : data)
// })

// avroWatcher.on('error', (err) => {
//     console.error('avro error', err)
// })

// jsonwatcher.on('change', (data, res) => {
//     console.log('json data', data)
// })

// jsonwatcher.on('error', (err) => {
//     console.error('json error', err)
// })



