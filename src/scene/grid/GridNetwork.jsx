import React from 'react'
import GridPoles from './GridPoles.jsx'
import GridLtLines from './GridLtLines.jsx'
import GridServiceDrops from './GridServiceDrops.jsx'
import GridTransformers from './GridTransformers.jsx'
import GridSubstation from './GridSubstation.jsx'
import GridSwitchgear from './GridSwitchgear.jsx'
import GridMeters from './GridMeters.jsx'
import GridFeederLabels from './GridFeederLabels.jsx'

// The real GridSense AI grid, replacing OsmPower.jsx's synthetic one. `grid` is null-checked by the
// caller (OsmWorld.jsx falls back to <OsmPower/> when absent) -- this component assumes grid is present.
export default function GridNetwork({ grid, colorMode = 'realistic', onAssetClick, showLabels = true }) {
  return (
    <group>
      <GridPoles grid={grid} colorMode={colorMode} onAssetClick={onAssetClick} showLabels={showLabels} />
      <GridLtLines grid={grid} colorMode={colorMode} onAssetClick={onAssetClick} showLabels={showLabels} />
      <GridServiceDrops grid={grid} colorMode={colorMode} onAssetClick={onAssetClick} showLabels={showLabels} />
      <GridTransformers grid={grid} colorMode={colorMode} onAssetClick={onAssetClick} showLabels={showLabels} />
      <GridSubstation grid={grid} onAssetClick={onAssetClick} />
      <GridSwitchgear grid={grid} onAssetClick={onAssetClick} showLabels={showLabels} />
      <GridMeters grid={grid} colorMode={colorMode} onAssetClick={onAssetClick} showLabels={showLabels} />
      {showLabels && <GridFeederLabels grid={grid} onAssetClick={onAssetClick} />}
    </group>
  )
}
