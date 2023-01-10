**Project Type:** Web App

**Team:** Solo

**Platform:** Google Chrome, Firefox

**Stack:** HTML, JavaScript, Three.js

**Description:** Infinite procedurally generated mesh rendered in chunks utilizing Perlin noise as a height map. Vertex colors are set by interpolating between green and red colors based on the terrain height.

**UI Controls:** 
- playerSpeed: set the speed the player can fly around the map
- chunkSize: set the size of a single chunk in square units 
- mapSize: set the size of the map in chunks (mapSize x mapSize)
- scale: set the scale of the terrain (higher scale means larger hills)
- smoothness: set how smooth the terrain will be (higher is more smooth)
- seed: sets the location of the player relative to the global terrain 

**Note:** Higher mapSize and scale means more mesh to generate which will slow performance. 

**Player Controls:** 
- click the viewport to run the app, click again or press ESC to stop
- fly forward/back/left/right: WASD
- fly up/down: EQ

**Known Bugs:** Graphical issue with view frustum culling.