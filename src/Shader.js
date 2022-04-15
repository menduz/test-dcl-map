export const fragmentShader = `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D u_input;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
const float tileSizeInPizels = 10.0;
const vec2 sizeOfTheTexture = vec2(512.0);

// pixel-perfect UV based on an arbitrary presicion UV + texture size
vec2 clampToTexture(vec2 uv, vec2 size) {
  vec2 clampUv = ceil(uv * size) / size;
	vec2 pixel = vec2(1.0) / size;
	return clampUv - pixel * vec2(0.5);
}

// this function detects a change in the pixel-perfect UV mapping of the texture
// using a screen pixel as delta
vec2 detectEdges(vec2 positionInScreen, vec2 size, float zoom) {
  vec2 delta = vec2(1.0, -1.0) / zoom / u_resolution; // top-left delta

  // fix aspect ratio
  if (u_resolution.x > u_resolution.y) {
    delta.x *= u_resolution.x/u_resolution.y;
  } else {
    delta.y *= u_resolution.y/u_resolution.x;
  }

  vec2 uv = clampToTexture(positionInScreen - delta, size);
  vec2 newUv = clampToTexture(positionInScreen, size);

  return (newUv - uv);
}

// this function returns a color for the tiles based on a texture color
vec4 colorFromType(float type) {
  if (type < 33.0)
    return vec4(0.4, 0.0, 0.8, 1.0);

  if (type < 65.0)
    return vec4(0.5, 0.5, 0.5, 1.0);

  return vec4(0.2, 0.2, 0.2, 1.0);
}

// given a pixel in screen, texture size and information of the tile, render the tile or the lines
float detectEdgesFloat(vec2 positionInScreen, vec2 size, float zoom, float info) {
  vec2 t = detectEdges(positionInScreen, size, zoom);

  bool hasTopBorder = false;
  bool hasLeftBorder = false;
  bool hasTopLeftPoint = false;

  bool inTopBorder = t.y != 0.0;
  bool inLeftBorder = t.x != 0.0;

  // read bit flags
  if (info >= 32.0) { hasTopLeftPoint = true; info -= 32.0; }
  if (info >= 16.0) { hasLeftBorder = true; info -= 16.0; }
  if (info >= 8.0) { hasTopBorder = true; info -= 8.0; }

  if (!hasTopBorder && !hasLeftBorder) {
    // disconnected everywhere: it's a square
    if (inLeftBorder || inTopBorder)
      return 0.0;
    return 1.0;
  }
  else
  if (hasTopBorder && hasLeftBorder && hasTopLeftPoint) {
    // connected everywhere: it's a square with lines
    return 1.0;
  }
  else
  {
    // connected left: it's a rectangle
    if (hasTopBorder && !inLeftBorder) return 1.0;
    // connected top: it's a rectangle
    if (hasLeftBorder && !inTopBorder) return 1.0;
  }

  return 0.0;
}

void main() {
  // offset = center of the map in uniform coords
  vec2 offset = u_mouse / u_resolution;
  float zoom;
  vec2 v_texcoord; // v_texcoord is a ratio-normalized sceen pixel in uniform coords
  if (u_resolution.x > u_resolution.y) {
    v_texcoord.x = gl_FragCoord.x/u_resolution.y - 0.5 - 0.5*(u_resolution.x-u_resolution.y)/u_resolution.y;
    v_texcoord.y = gl_FragCoord.y/u_resolution.y - 0.5;
    zoom = sizeOfTheTexture.x / u_resolution.y * tileSizeInPizels;
  } else {
    v_texcoord.x = gl_FragCoord.x/u_resolution.x - 0.5;
    v_texcoord.y = gl_FragCoord.y/u_resolution.x - 0.5 - 0.5*(u_resolution.y-u_resolution.x)/u_resolution.x;
    zoom = sizeOfTheTexture.y / u_resolution.x * tileSizeInPizels;
  }
  

  // tileOfInterest, represented as UV coords of the MAP texture
  vec2 tileOfInterest = v_texcoord / zoom + offset;

  // render black tiles outside of the image map data-range
  if (tileOfInterest.x > 1.0 || tileOfInterest.y > 1.0 || tileOfInterest.y < 0.0 || tileOfInterest.x < 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // uvs of the texture for the center of coordinates
  // and the pixel of the screen (tileOfInterest) 
  vec2 centerUv = clampToTexture(offset, sizeOfTheTexture);
  vec2 uv = clampToTexture(tileOfInterest, sizeOfTheTexture);
  
  // if we are rendering the center of coordinates
  if (length(centerUv - uv) == 0.0){
    gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
    return;
  }
  
  vec4 data = texture2D(u_input, uv);

  if (data.a > 0.0) {
    if (detectEdgesFloat(tileOfInterest, sizeOfTheTexture, zoom, data.r * 256.0) == 0.0)
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    else
      gl_FragColor = colorFromType(data.g * 256.0);
  } else {
    if (detectEdgesFloat(tileOfInterest, sizeOfTheTexture, zoom, 0.0) == 0.0)
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    else
      gl_FragColor = vec4(0.05, 0.05, 0.05, 1.0);
  }
}`;
