var viewer = new Cesium.Viewer('cesiumContainer');
var entity = new Cesium.Entity({
    id: 'test',
    name: 'Testitificate',
    show: true,
    position: Cesium.Cartesian3.fromDegrees(0, 0),
    point: {
      pixelSize : 5,
      color : Cesium.Color.RED,
      outlineColor : Cesium.Color.WHITE,
      outlineWidth : 2
    }
  })
  viewer.entities.add(entity)
  viewer.zoomTo(entity)