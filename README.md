# Leaflet.WebMercatorScales
Leaflet plugin that visualizes scales and distortions in Web Mercator projection.

Change of linear scale with latitude in Web Mercator projection can affect determination of distances from the map, especially for large areas. Standard scale bar corresponds to the map center. This plugin gives variable scale bar along map edges (concept used on nautical charts) which can be used to see the effect of linear scale change or for estimation of distances between objects. Simply by panning the map one can bring part of the map closer to the scale bar and estimate distance or size.

See the demo.

Options:

distortionParMask: [true | false] - Creates mask that hides areas on map with more than [distortionThresh] in percents of distortions of parallel scale compared to center of map.
distortionMerMask: [true | false] - Creates mask that hides areas on map with more than [distortionThresh] in percents of distortions of meridian scale compared to center of map.
distortionThresh: [integer] - Percent used for distortion mask, 5 (%) was found as distortions generally not noticed by naked eye.
bottomScaleBar: [true | false] - Draw bottom edge scale bar. 
leftScaleBar: [true | false] - Draw left edge scale bar.
rightScaleBar: [true | false] - Draw right edge scale bar.
topScaleBar: [true | false] - Draw top edge scale bar.
verticalScaleLines: [true | false] - Draw vertical variable scale bar lines on map. 
horizontalScaleLines: [true | false] - Draw horizontal variable scale bar lines on map.
parScaleIsolines: [true | false] - Draw lines of constant parallel scale.
merScaleIsolines: [true | false] - Draw lines of constant meridian scale.
color: '#000' - Color for scale bars.
colorMer: '#00f' - Color for meridian scale distortion mask.
colorPar: '#f00' - Color for parallel scale distortion mask.
opacity: 0.6 - Opacity of elements drawn over map.

Example (used in demo):

`L.webMercatorScales({ distortionParMask: true,
						 distortionMerMask: true,
						 distortionThresh: 5, 
						 bottomScaleBar: true, 
						 leftScaleBar: false,
						 rightScaleBar: false, 
						 topScaleBar: true,
						 verticalScaleLines: true,
						 horizontalScaleLines: false,
						 parScaleIsolines: true,
						 merScaleIsolines: true,
						 color: '#000',
						 colorMer: '#00f',
						 colorPar: '#f00',
						 opacity: 0.6 }).addTo(map);`
             
Authors: Dražen Tutić (dtutic@geof.hr) and Ana Kuveždić Divjak (akuvezdic@geof.hr), University of Zagreb, Faculty of Geodesy, GEOF-OSGL Lab
