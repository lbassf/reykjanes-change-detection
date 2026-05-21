# Volcanic Change Detection: Reykjanes Peninsula, Iceland

This is a change detection workflow for the 2023–2024 Sundhnúkur eruption series on the Reykjanes Peninsula in Iceland. The project combines AlphaEarth satellite embeddings and a traditional Sentinel-2 spectral approach (dNBR) to identify landscape change and to look at the impact on buildings in and around Grindavík.

The repository contains the full Jupyter Notebook, the conda environment file, the GEE export script and a README with the setup instructions. It was made for the SDS210 course project at the University of Zurich.

---

## Research Questions

- **RQ1:** Where did the most significant landscape changes occur between 2023 and 2024?
- **RQ2:** How does embedding-based change detection compare to a traditional spectral approach?
- **RQ3:** Which critical infrastructure sites fall within the areas of highest detected landscape change?

---

## Data Sources

All input data is open-access. The raster files have to be exported from Google Earth Engine before the notebook can be run (see Setup below).

- **AlphaEarth Satellite Embeddings** — Google Earth Engine, dataset `GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL`. 64-dimensional unit-normalized embeddings at 10 m resolution.
- **Sentinel-2 Surface Reflectance** — Google Earth Engine, dataset `COPERNICUS/S2_SR_HARMONIZED`, cloud-filtered using `GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED`. Median composite from May to September.
- **OpenStreetMap building footprints** — downloaded via [overpass-turbo.eu](https://overpass-turbo.eu) for the study area bounding box. Two snapshots are used: a pre-eruption one (1 November 2023) and a current one.

---

## Repository Structure

```
reykjanes-change-detection/
├── README.md
├── environment.yml
├── .gitignore
├── data/
│   ├── raw/                # raw inputs (gitignored)
│   └── processed/          # derived files
├── notebooks/
│   └── analysis.ipynb      # main analysis notebook
├── outputs/                # exported maps and results (gitignored)
└── gee_scripts/
    └── export_data.js      # GEE script for raster export
```

The `data/` and `outputs/` folders are gitignored. The raw rasters need to be exported from Google Earth Engine and saved into `data/raw/` before running the notebook.

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd reykjanes-change-detection
```

### 2. Create the conda environment

```bash
conda env create -f environment.yml
conda activate reykjanes-change-detection
```

The environment includes `rasterio`, `geopandas`, `numpy`, `pandas`, `matplotlib`, `cmcrameri`, `xarray`, `rioxarray` and Jupyter.

### 3. Download the raster data from Google Earth Engine

Open the GEE script in `gee_scripts/export_data.js` in the Earth Engine Code Editor and run it. Then click **Run** on each of the four export tasks. This produces four GeoTIFFs in your Google Drive in the folder `eeExports_sds210`:

- `AEF_embedding_2023.tif` (64 bands)
- `AEF_embedding_2024.tif` (64 bands)
- `S2_composite_2023.tif` (12 bands)
- `S2_composite_2024.tif` (12 bands)

Download all four files and put them in `data/raw/`.

### 4. Download the OSM building data

Open [overpass-turbo.eu](https://overpass-turbo.eu) and run the following query for the current snapshot:

```
[out:json][timeout:60];
(
  way["building"](63.8,-22.62,63.95,-22.15);
  relation["building"](63.8,-22.62,63.95,-22.15);
  node["building"](63.8,-22.62,63.95,-22.15);
);
out body;
>;
out skel qt;
```

Export as GeoJSON and save it to `data/raw/buildings_post_eruption.geojson`.

For the pre-eruption snapshot, add `[date:"2023-11-01T00:00:00Z"]` to the first line of the query and save the export to `data/raw/buildings_pre_eruption.geojson`.

---

## Execution Order

Open the notebook and run all cells from top to bottom:

```bash
jupyter notebook notebooks/analysis.ipynb
```

Then use **Kernel → Restart & Run All**.

The notebook is structured into seven sections that execute in order:

1. **Setup & Parameters** — imports, helper functions, paths, study parameters
2. **Data Loading** — inspection of the raster metadata
3. **Inspection & Cleaning** — crop window and ocean mask (MNDWI-based)
4. **RQ1** — embedding-based cosine similarity change map
5. **RQ2** — spectral dNBR map, side-by-side comparison and agreement map on a true-color background
6. **RQ3** — building footprint analysis and overlap with the change mask
7. **Summary** — interpretation and limitations

All file paths in the notebook are relative. All thresholds, file paths and parameters are collected in Section 1 so that the workflow can be tuned from one single place.
