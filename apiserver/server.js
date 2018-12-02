const express = require('express')
const mysql = require('mysql')
const etl = require('./etl')
const https = require('https')

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
    etl.mysqlData(pool, req.params.icao, 'planedata', (err, data) => {
        if (err) {
            console.error(err)
            res.send(500, JSON.stringify(err))
            return
        }
        res.json(data)
    })
})


app.get('/uav', (req, res) => {
    etl.mysqlUAVData(pool, (err, data) => {
        if (err) {
            console.error(err)
            res.send(500, JSON.stringify(err))
            return
        }
        res.json(data)
    })
})

app.get('/live', (req, res) => {
    let httpsreq = https.request(
        'https://global.adsbexchange.com/VirtualRadar/AircraftList.json?fNBnd=-34.41823916300348&fEBnd=150.14190673828128&fSBnd=-36.52950186333475&fWBnd=147.18933105468753&trFmt=sa',
        httpsres => {
            let allData = ''
            httpsres.on('data', d => {
                allData += d
            })

            httpsres.on('end', () => {
                res.type('application/json')
                res.send(allData)
            })
        }
    )

    httpsreq.on('error', err => console.error(err))
    httpsreq.end()
})

app.listen(PORT, () => {
    console.log('API server started')
})
