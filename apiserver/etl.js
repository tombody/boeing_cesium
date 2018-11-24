const { performance } = require('perf_hooks');
mysqlCache = {}

module.exports = {
    mysqlData: (pool, icao, callback) => {
        if (mysqlCache[icao] && mysqlCache[icao].expires < performance.now()) {
            mysqlCache[icao].expires = performance.now() + 60 * 1000
            callback(undefined, mysqlCache[icao].data)
            return
        }
        pool.query("SELECT TimeLoc, Longitude, Latitude, Altitude, Heading FROM planedata WHERE ICAO = ?;", [icao], (err, results, fields) => {
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
                //speed: v.GroundSpeed
            }})
            mysqlCache[icao] = {
                expires: performance.now() + 60 * 1000,
                data
            }
            callback(undefined, data)
        })
    },
    mysqlBulk: (pool, callback) => {
        pool.query("SELECT ICAO, TimeLoc, Longitude, Latitude, Altitude, Heading FROM planedata ORDER BY ICAO, Latitude;", (err, results, fields) => {
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
                    continue
                map[v.ICAO].push({
                    time: v.TimeLoc,
                    lat: v.Latitude,
                    lng: v.Longitude,
                    alt: v.Altitude,
                    heading: v.Heading,
                    //speed: v.GroundSpeed
                })
            })
            callback(undefined, map)
        })
    }
}