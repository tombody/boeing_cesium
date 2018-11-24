var viewer = new Cesium.Viewer('cesiumContainer')
viewer.terrainProvider = Cesium.createWorldTerrain()
const day = 1000 * 60 * 60 * 24

function hexToRGB(hex, alpha = 1) {
    var r = parseInt(hex.slice(0, 2), 16),
        g = parseInt(hex.slice(2, 4), 16),
        b = parseInt(hex.slice(4, 6), 16);
    return [ r, g, b, alpha ]
}

var doneOnce = false

function buildPlane(icao, res) {
    var positions = new Cesium.SampledPositionProperty()
    var orientations = new Cesium.SampledProperty(Cesium.Quaternion)
    let times = []
    let rawPositions = []
    let rawOrientations = []
    let min = Number.MAX_VALUE
    let max = Number.MIN_VALUE
    for (let v of res) {
        let time = v.time
        if (time < min) min = time
        if (time > max) max = time
        times.push(new Cesium.JulianDate(0, time))
        rawPositions.push(Cesium.Cartesian3.fromDegrees(v.lng, v.lat, v.alt))
        rawOrientations.push(Cesium.Quaternion.fromHeadingPitchRoll([v.heading, 0, 0]))
    }
    positions.addSamples(times, rawPositions)
    orientations.addSamples(times, rawOrientations)
    var entity = new Cesium.Entity({
        id: icao,
        name: 'ICAO: ' + icao,
        show: true,
        position: positions,
        /* orientation: orientations,
        model: {
            uri: '/Apps/SampleData/models/CesiumAir/Cesium_Air.glb',
            minimumPixelSize: 32
        }, */
        /* cylinder: {
            topRadius: 8046,
            bottomRadius: 8046,
            length: 1609,
            material: new Cesium.ColorMaterialProperty(new Cesium.Color(...hexToRGB(icao, 0.5)))
        }, */
        point: {
            pixelSize : 5,
            color : new Cesium.Color(...hexToRGB(icao)),
            outlineColor : Cesium.Color.WHITE,
            outlineWidth : 2
        },
        /* path: {
            leadTime: day,
            trailTime: day,
            width: 0.5,
            material: Cesium.Color.RED
        } */
    })
    viewer.entities.add(entity)
    if (!doneOnce) {
        doneOnce = true
        viewer.clock.currentTime = new Cesium.JulianDate(0, min)
        viewer.timeline.zoomTo(new Cesium.JulianDate(0, min), new Cesium.JulianDate(0, max))
    }
}

function addPlane(icao) {
    fetch('http://172.22.177.187:3000/tracks/' + icao)
    .then(res => res.json())
    .then(res => {
        buildPlane(icao, res)
    }).catch(err => {
        console.error(err)
    })
}

fetch('http://172.22.177.187:3000/icao')
.then(res => res.json())
.then(res => {
    let i = 0
    for (let icao of res) {
        addPlane(icao)
        if (i++ > 20)
            break
    }
}).catch(err => {
    console.error(err)
})
/* fetch('http://172.22.177.187:3000/tracks')
.then(res => res.json())
.then(res => {
    let i = 0
    for (let icao in res) {
        buildPlane(icao, res[icao])
    }
}).catch(err => {
    console.error(err)
}) */

viewer.zoomTo(282.309448, 38.958357)
