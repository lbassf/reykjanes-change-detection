/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Script to download AlphaEarth / Satellite Embeddings and cloud-filtered Sentinel-2

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DEFINITIONS

/////////////////////////////////////////////////////////////
// SPACE


// Sundhnúkur eruption series on the Reykjanes Peninsula in Iceland from 2023 to 2024
var aoi = ee.Geometry.Rectangle([-22.62, 63.8, -22.15, 63.95]);

Map.setOptions('SATELLITE');
Map.centerObject(aoi, 10);

/////////////////////////////////////////////////////////////
// TIME
// Must be between 2017 and 2024 for GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL

var year_1 = 2023;
var year_2 = 2024;

var start_1st = ee.Date.fromYMD(year_1, 1, 1);
var end_1st   = start_1st.advance(1, 'year');

var start_2nd = ee.Date.fromYMD(year_2, 1, 1);
var end_2nd   = start_2nd.advance(1, 'year');

/////////////////////////////////////////////////////////////
// VISUALS

var palettes = require('users/gena/packages:palettes');
var lajolla = palettes.crameri.lajolla[25].reverse();
var batlow = palettes.crameri.batlow[25];
var inferno = palettes.matplotlib.inferno[7];
var thermal = palettes.cmocean.Thermal[7].reverse();



var s2FalseColorVis = {
  bands: ['B12', 'B8', 'B4'],
  min: 0,
  max: [3000, 4000, 2500]
};

/////////////////////////////////////////////////////////////
// USER PARAMETERS FOR S2 CLOUD MASKING

var minClearProbability = 0.6;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DATA

// AlphaEarth / Satellite Embeddings
var embeddings = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL');

// Sentinel-2 Surface Reflectance
var s2Sr = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');

// Cloud Score+
var s2Csp = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');

// All 64 embedding bands must be used together.
var embeddingBands = [
  'A00','A01','A02','A03','A04','A05','A06','A07',
  'A08','A09','A10','A11','A12','A13','A14','A15',
  'A16','A17','A18','A19','A20','A21','A22','A23',
  'A24','A25','A26','A27','A28','A29','A30','A31',
  'A32','A33','A34','A35','A36','A37','A38','A39',
  'A40','A41','A42','A43','A44','A45','A46','A47',
  'A48','A49','A50','A51','A52','A53','A54','A55',
  'A56','A57','A58','A59','A60','A61','A62','A63'
];

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FUNCTIONS

/////////////////////////////////////////////////////////////
// Sentinel-2 cloud masking using Cloud Score+

function maskClouds(image) {
  var clearSkyProb = image.select('cs_cdf');
  return image.updateMask(clearSkyProb.gte(minClearProbability));
}

/////////////////////////////////////////////////////////////
// Sentinel-2 edge masking

function maskEdges(image) {
  return image.updateMask(
    image.select('B8A').mask().updateMask(image.select('B9').mask())
  );
}

/////////////////////////////////////////////////////////////
// Build one annual embedding image for a given year

function getAnnualEmbedding(startDate, endDate, region) {
  return embeddings
    .filterBounds(region)
    .filterDate(startDate, endDate)
    .mosaic()
    .select(embeddingBands)
    .clip(region);
}

/////////////////////////////////////////////////////////////
// Build a cloud-filtered Sentinel-2 median false color composite
// for May to September of the selected year.

function getS2FalseColorComposite(year, region) {
  
  var start = ee.Date.fromYMD(year, 5, 1);
  var end = ee.Date.fromYMD(year, 9, 30).advance(1, 'day');
  
  var filter = ee.Filter.and(
    ee.Filter.bounds(region),
    ee.Filter.date(start, end)
  );
  
  var s2Composite = s2Sr
    .filter(filter)
    .map(maskEdges)
    .linkCollection(
      s2Csp.filter(filter),
      ['cs_cdf']
    )
    .map(maskClouds)
    .median()
    .clip(region);
  
  return s2Composite;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PROCESSING

/////////////////////////////////////////////////////////////
// Embedding images for the two years

var image_1st = getAnnualEmbedding(start_1st, end_1st, aoi);
var image_2nd = getAnnualEmbedding(start_2nd, end_2nd, aoi);

/////////////////////////////////////////////////////////////
// Sentinel-2 visual composites for the two years

var s2_1st = getS2FalseColorComposite(year_1, aoi);
var s2_2nd = getS2FalseColorComposite(year_2, aoi);

/////////////////////////////////////////////////////////////
// Add Sentinel-2 false color composites to the map

Map.addLayer(s2_1st, s2FalseColorVis, 'S2 false color ' + year_1, false);
Map.addLayer(s2_2nd, s2FalseColorVis, 'S2 false color ' + year_2, false);

/////////////////////////////////////////////////////////////
// Optional quick-look visualization of embedding bands
// Note: individual embedding bands are not physically interpretable like spectral bands.

Map.addLayer(
  image_1st.select(['A00', 'A01', 'A02']),
  {min: -0.25, max: 0.25},
  'Embedding ' + year_1,
  false
);

Map.addLayer(
  image_2nd.select(['A00', 'A01', 'A02']),
  {min: -0.25, max: 0.25},
  'Embedding ' + year_2,
  false
);



/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// EXPORTS

var exportFolder = 'eeExports_sds210';

/////////////////////////////////////////////////////////////
// Get the native projection / EPSG of the source data in the AOI

function getS2Projection(year, region) {
  var start = ee.Date.fromYMD(year, 5, 1);
  var end = ee.Date.fromYMD(year, 9, 30).advance(1, 'day');
  
  var filter = ee.Filter.and(
    ee.Filter.bounds(region),
    ee.Filter.date(start, end)
  );
  
  // Use a 10 m Sentinel-2 band to retrieve the native projection.
  return s2Sr
    .filter(filter)
    .first()
    .select('B2')
    .projection();
}

function getEmbeddingProjection(startDate, endDate, region) {
  return embeddings
    .filterBounds(region)
    .filterDate(startDate, endDate)
    .first()
    .select('A00')
    .projection();
}

var s2Proj_1st = getS2Projection(year_1, aoi);
var s2Proj_2nd = getS2Projection(year_2, aoi);

var embProj_1st = getEmbeddingProjection(start_1st, end_1st, aoi);
var embProj_2nd = getEmbeddingProjection(start_2nd, end_2nd, aoi);

print('S2 projection ' + year_1, s2Proj_1st);
print('S2 projection ' + year_2, s2Proj_2nd);
print('Embedding projection ' + year_1, embProj_1st);
print('Embedding projection ' + year_2, embProj_2nd);

/////////////////////////////////////////////////////////////
// Export Sentinel-2 composites
// All optical bands starting with B
Export.image.toDrive({
  image: s2_1st.select('B.*'),
  description: 'S2_composite_' + year_1,
  folder: exportFolder,
  fileNamePrefix: 'S2_composite_' + year_1,
  region: aoi,
  scale: 10,
  crs: 'EPSG:32627',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: s2_2nd.select('B.*'),
  description: 'S2_composite_' + year_2,
  folder: exportFolder,
  fileNamePrefix: 'S2_composite_' + year_2,
  region: aoi,
  scale: 10,
  crs: 'EPSG:32627',
  maxPixels: 1e13
});

/////////////////////////////////////////////////////////////
// Export embedding images
// All 64 embedding bands

Export.image.toDrive({
  image: image_1st.select(embeddingBands),
  description: 'AEF_embedding_' + year_1,
  folder: exportFolder,
  fileNamePrefix: 'AEF_embedding_' + year_1,
  region: aoi,
  scale: 10,
  crs: 'EPSG:32627',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: image_2nd.select(embeddingBands),
  description: 'AEF_embedding_' + year_2,
  folder: exportFolder,
  fileNamePrefix: 'AEF_embedding_' + year_2,
  region: aoi,
  scale: 10,
  crs: 'EPSG:32627',
  maxPixels: 1e13
});
