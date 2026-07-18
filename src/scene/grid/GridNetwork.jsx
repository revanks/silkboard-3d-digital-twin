import React from 'react'
import GridPoles from './GridPoles.jsx'
import GridLtLines from './GridLtLines.jsx'
import GridServiceDrops from './GridServiceDrops.jsx'
import GridTransformers from './GridTransformers.jsx'
import GridSubstation from './GridSubstation.jsx'
import GridSwitchgear from './GridSwitchgear.jsx'
import GridMeters from './GridMeters.jsx'

// The real GridSense AI grid, replacing OsmPower.jsx's synthetic one. `grid` is null-checked by the
// caller (OsmWorld.jsx falls back to <OsmPower/> when absent) -- this component assumes grid is present.
export default function GridNetwork({ grid, colorMode = 'realistic', onAssetClick }) {
  return (
    <group>
      <GridPoles grid={grid} colorMode={colorMode} onAssetClick={onAssetClick} />
      <GridLtLines grid={grid} colorMode={colorMode} onAssetClick={onAssetClick} />
      <GridServiceDrops grid={grid} colorMode={colorMode} onAssetClick={onAssetClick} />
      <GridTransformers grid={grid} colorMode={colorMode} onAssetClick={onAssetClick} />
      <GridSubstation grid={grid} onAssetClick={onAssetClick} />
      <GridSwitchgear grid={grid} onAssetClick={onAssetClick} />
      <GridMeters grid={grid} colorMode={colorMode} onAssetClick={onAssetClick} />
    </group>
  )
}
