const express = require('express')
const mysql = require('mysql')
const etl = require('./etl')

const pool = mysql.createPool({
    connectionLimit : 10,
    host: '172.22.250.73',
    user: 'admIn',
    password: '123',
    database: 'boeing_hackathon_2018'
})

const app = express()
const PORT = 3000

app.get('/icao', (req, res) => {
    pool.query("SELECT DISTINCT ICAO FROM planedata;", (err, results, fields) => {
        if (err) {
            console.error(err)
            res.send(500, JSON.stringify(err))
            return
        }
        res.json(results.map(v => v.ICAO))
    })
})

app.get('/tracks', (req, res) => {
    etl.mysqlBulk(pool, (err, data) => {
        if (err) {
            console.error(err)
            res.send(500, JSON.stringify(err))
            return
        }
        res.json(data)
    })
})

app.get('/tracks/:icao', (req, res) => {
    etl.mysqlData(pool, req.params.icao, (err, data) => {
        if (err) {
            console.error(err)
            res.send(500, JSON.stringify(err))
            return
        }
        res.json(data)
    })
})

app.listen(PORT, () => {
    console.log('API server started')
})
