const { performance } = require('perf_hooks');
mysqlCache = {}

module.exports = {
    mysqlData: (pool, table, icao, callback) => {
        if (mysqlCache[icao] && mysqlCache[icao].expires < performance.now()) {
            mysqlCache[icao].expires = performance.now() + 60 * 1000
            callback(undefined, mysqlCache[icao].data)
            return
        }
        pool.query("SELECT TimeLoc, Longitude, Latitude, Altitude, Heading, GroundSpeed FROM ? WHERE ICAO = ?;", [table, icao], (err, results, fields) => {
            if (err) {
                callback(err)
                return
            }
            let data = results.map(v => { return {
                time: v.TimeLoc,
                lat: v.Latitude,
                lng: v.Longitude,
                alt: v.Altitude,
                heading: v.Heading,
                speed: v.GroundSpeed
            }})
            mysqlCache[icao] = {
                expires: performance.now() + 60 * 1000,
                data
            }
            callback(undefined, data)
        })
    },
    mysqlUAVData: (pool, callback) => {
        pool.query("SELECT TimeLoc, Longitude, Latitude, Altitude, Heading, ErrorMessage FROM drone ORDER BY TimeLoc;", (err, results, fields) => {
            if (err) {
                callback(err)
                return
            }
            let data = results.map(v => { return {
                time: v.TimeLoc,
                lat: v.Latitude,
                lng: v.Longitude,
                alt: v.Altitude,
                heading: v.Heading,
                errorMessage: v.ErrorMessage
            }})
            callback(undefined, data)
        })
    },
    mysqlBulk: (pool, callback) => {
        pool.query("SELECT ICAO, TimeLoc, Longitude, Latitude, Altitude, Heading, GroundSpeed FROM planedata ORDER BY ICAO, Latitude;", (err, results, fields) => {
            if (err) {
                callback(err)
                return
            }
            let map = {}
            let last = {}
            results.forEach(v => {
                if (!map[v.ICAO]) {
                    last = {}
                    map[v.ICAO] = []
                }
                if (last.Longitude == v.Longitude)
                    return
                map[v.ICAO].push({
                    time: v.TimeLoc,
                    lat: v.Latitude,
                    lng: v.Longitude,
                    alt: v.Altitude,
                    heading: v.Heading,
                    speed: v.GroundSpeed
                })
            })
            callback(undefined, map)
        })
    }
}