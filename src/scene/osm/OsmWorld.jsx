import React, { useMemo } from 'react'
import { annotateBridgeRamps } from './geo.js'
import OsmRoads from './OsmRoads.jsx'
import OsmBuildings from './OsmBuildings.jsx'
import OsmWater from './OsmWater.jsx'
import OsmTraffic from './OsmTraffic.jsx'
import OsmLights from './OsmLights.jsx'
import OsmPower from './OsmPower.jsx'
import OsmMetro from './OsmMetro.jsx'
import OsmLabels from './OsmLabels.jsx'
import OsmHighlights from './OsmHighlights.jsx'
import GridNetwork from '../grid/GridNetwork.jsx'

// The real-data city: everything sourced from the OSM extract.
// Rendered instead of the procedural Roads/Buildings/Metro/… when the
// JSON is available; the procedural scene remains the fallback.
export default function OsmWorld({ osm, envMode = 'day', grid = null, showGrid = true, colorMode = 'realistic', onAssetClick }) {
  // Mark which bridge-way ends actually touch down (shared ends stay
  // elevated) — roads, traffic, and lights all read the rs/re flags.
  useMemo(() => annotateBridgeRamps(osm.roads), [osm])
  return (
    <group>
      <OsmRoads osm={osm} />
      <OsmBuildings osm={osm} envMode={envMode} />
      <OsmWater osm={osm} envMode={envMode} />
      <OsmTraffic osm={osm} />
      <OsmLights osm={osm} envMode={envMode} />
      {/* Real GridSense AI grid asset data, when loaded and shown; falls back to the synthetic
          placeholder grid otherwise (missing export, or user-toggled off). */}
      {grid && showGrid ? (
        <GridNetwork grid={grid} colorMode={colorMode} onAssetClick={onAssetClick} />
      ) : (
        <OsmPower osm={osm} />
      )}
      <OsmMetro osm={osm} />
      <OsmLabels osm={osm} />
      <OsmHighlights osm={osm} />
    </group>
  )
}
