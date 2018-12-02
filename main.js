var viewer = new Cesium.Viewer('cesiumContainer')
//viewer.terrainProvider = Cesium.createWorldTerrain()
const day = 1000 * 60 * 60 * 24
const dayNumber = Cesium.JulianDate.fromDate(new Date(1970, 0)).dayNumber
let LOADED_TRACKS = false
let PARSED_TRACKS = false
let SHOW_CYLINDERS = false

function updateLoadingScreen() {
    if (!LOADED_TRACKS || !PARSED_TRACKS)
        $('#loadingScreen').show()
    else
        $('#loadingScreen').hide()
    if (!LOADED_TRACKS) {
        $('#loadingScreenMessage').text('Loading Flight Tracks...')
    } else {
        if (!PARSED_TRACKS) {
            $('#loadingScreenMessage').text('Parsing Flight Tracks...')
        }
    }
}

function setloadedTracks(bool) {
    LOADED_TRACKS = bool
    updateLoadingScreen()
}

function setParsedTracks(bool) {
    PARSED_TRACKS = bool
    updateLoadingScreen()
}

setloadedTracks(false)

$('#showCylinderButton').click(() => {
    SHOW_CYLINDERS = !SHOW_CYLINDERS
    $('#showCylinderButton').text(SHOW_CYLINDERS ? 'Hide Plane Boundaries' : 'Show Plane Boundaries')
})

function hexToRGB(hex, alpha = 1) {
    var r = parseInt(hex.slice(0, 2), 16) / 255,
        g = parseInt(hex.slice(2, 4), 16) / 255,
        b = parseInt(hex.slice(4, 6), 16) / 255
    return [ r, g, b, alpha ]
}

function epochDate(epochTime) {
    let d = new Date(0)
    d.setUTCSeconds(epochTime)
    return d
}

var doneOnce = false

function buildPlane(icao, res, updateTime = false) {
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
        //times.push(new Cesium.JulianDate(dayNumber + Math.floor(time / day) * day, time - Math.floor(time / day) * day))
        times.push(Cesium.JulianDate.fromDate(epochDate(time)))
        rawPositions.push(Cesium.Cartesian3.fromDegrees(v.lng + 720, v.lat, v.alt))
        rawOrientations.push(Cesium.Quaternion.fromHeadingPitchRoll([v.heading, 0, 0]))
    }
    positions.addSamples(times, rawPositions)
    orientations.addSamples(times, rawOrientations)
    let col = icao.length === 6 ? icao : 'ffffff'
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
        cylinder: {
            topRadius: 8046,
            bottomRadius: 8046,
            length: 1609,
            material: Cesium.Color.fromAlpha(Cesium.Color.YELLOW, 0.25),
            show: icao.length !== 6 ? false : new Cesium.CallbackProperty(() => {
                return SHOW_CYLINDERS
            })
        },
        point: {
            pixelSize : icao.length !== 6 ? 15 : 10,
            color : new Cesium.Color(...hexToRGB(col)),
            outlineColor : Cesium.Color.WHITE,
            outlineWidth : 2
        },
        /* polyline: {
            positions: [
                new Cesium.Cartesian3(0, 0, 0),
                new Cesium.Cartesian3(0, 1000, 0)
            ]
        }, */
        /* path: {
            leadTime: day,
            trailTime: day,
            width: 0.5,
            material: Cesium.Color.RED
        } */
    })
    viewer.entities.add(entity)
    if (updateTime) {
        if (!doneOnce) {
            doneOnce = true
            viewer.clock.currentTime = Cesium.JulianDate.fromDate(epochDate(min))
            viewer.timeline.zoomTo(Cesium.JulianDate.fromDate(epochDate(min)), Cesium.JulianDate.fromDate(epochDate(max)))
        }
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

const DO_INDIVIDUALLY = false
if (DO_INDIVIDUALLY) {
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
} else {
    fetch('http://172.22.177.187:3000/tracks')
    .then(res => res.json())
    .then(res => {
        setloadedTracks(true)
        setTimeout(() => {
            for (let icao in res) {
                buildPlane(icao, res[icao], true)
            }
            setParsedTracks(true)
        })
    }).catch(err => {
        console.error(err)
    })
    setloadedTracks(true)
    setParsedTracks(true)
}

fetch('http://172.22.177.187:3000/uav')
.then(res => res.json())
.then(res => {
    buildPlane('uav_icao', res, true)
    let errorMessages = []
    let times = []
    let errorIndex = []
    let sample = new Cesium.SampledProperty(Number)
    for (let v of res) {
        times.push(Cesium.JulianDate.fromDate(epochDate(v.time)))
        errorIndex.push(times.length - 1)
        errorMessages.push(v.errorMessage)
    }
    sample.addSamples(times, errorIndex)
    let lastTime = undefined
    let textArea = $('#UAV1Status')
    viewer.clock.onTick.addEventListener(() => {
        if (lastTime == viewer.clock.currentTime) return
        lastTime = viewer.clock.currentTime
        let errIndex = Math.floor(sample.getValue(lastTime))
        let err
        try {
            err = errIndex == NaN && errIndex >= 0 && errIndex < errorMessages.length ? 'Not Active' : (errorMessages[errIndex].length == 0 ? 'Clear' : errorMessages[errIndex])
        } catch (e) {
            err = 'Not Active'
        }
        textArea.text(err)
        textArea.removeClass(['statusClear', 'statusWarning', 'statusCritical'])
        if (!err) return
        if (err.includes('Critical')) textArea.addClass('statusCritical')
        else if (err.includes('Warning')) textArea.addClass('statusWarning')
        else textArea.addClass('statusClear')
    }, sample)
}).catch(err => {
    console.error(err)
})

viewer.zoomTo(282.309448, 38.958357)


// LIVE STUFF V

function buildLivePlane(planeData) {
    let icao = planeData.Icao
    var positions = new Cesium.SampledPositionProperty()
    let times = []
    let rawPositions = []
    let posData = planeData.Cos
    for (let i = 0; i < posData.length; i += 4) {
        let time = posData[i + 2]
        times.push(Cesium.JulianDate.fromDate(epochDate(Math.floor(time / 1000))))
        rawPositions.push(Cesium.Cartesian3.fromDegrees(
            posData[i + 1], posData[i], posData[i + 3]
        ))
    }
    positions.addSamples(times, rawPositions)
    var entity = new Cesium.Entity({
        id: icao,
        name: 'ICAO: ' + icao,
        show: true,
        position: positions,
        point: {
            pixelSize : 5,
            color : new Cesium.Color(...hexToRGB(icao)),
            outlineColor : Cesium.Color.WHITE,
            outlineWidth : 2
        }
    })
    viewer.entities.add(entity)
}

// fetch('http://172.22.177.187:3000/live')
// .then(res => res.json())
// .then(res => {
//     for (let plane of res.acList) {
//         buildLivePlane(plane)
//     }
// })
// .catch(err => console.error(err))
