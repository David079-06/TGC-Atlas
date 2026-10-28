# Third-party assets and attribution

## Leaflet 1.9.4
Files: `public/vendor/leaflet.js`, `public/vendor/leaflet.css`

Copyright © 2010–2023 Volodymyr Agafonkin, © 2010–2011 CloudMade. Released under the BSD 2-Clause license. The original notice and license are retained in `licenses/LEAFLET.txt`.

Official website: https://leafletjs.com/

## Geographic information
Files: `public/geo/countries.min.json` and `public/geo/world-countries.geojson`.

These are public-facing geographic boundary datasets already used by the Hatchable app, with Natural Earth-style properties. Their original extraction/conversion history was not documented in this project. Verify their precise upstream provenance and redistribution terms before commercial redistribution; **do not assume they are user-created original map data**.

The app also queries OpenStreetMap and Photon at runtime. OpenStreetMap contributors retain their own rights under the ODbL; attribution is provided in the map interface. https://www.openstreetmap.org/copyright

Geo area planning also queries `world-countries-cities-db`; the developer source note identifies its ODbL data source. No private transaction or store records are exported here.
