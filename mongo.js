const mongoose = require('mongoose')
const config = require('./config.json')

const uri = config.mongourl;
mongoose.connect(uri)
const conn = mongoose.connection

if (process.env.MONGO_DEBUG == '1') mongoose.set('debug', true)

conn.on('open', () => {
    console.log(`Successfully connected to ${uri}`)
})

conn.on('error', e => {
  console.error(e)
})

conn.on('close', () => {
  console.log(`Connection ${uri} was closed`)
})


module.exports = mongoose