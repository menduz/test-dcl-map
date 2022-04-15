import "glsl-canvas-js";

export function render(shader) {
  if (window.previousRendering) {
    window.previousRendering.destroy();
  }

  const main = document.createElement("main");
  document.body.appendChild(main);

  main.innerHTML = `
    <div id="scene">
      <canvas></canvas>
    </div>
  `;

  const canvas = main.querySelector("canvas");
  const glsl = new window.GlslCanvas(canvas, {
    extensions: ["OES_standard_derivatives", "EXT_shader_texture_lod"],
    antialias: false
  });
  let played = false;

  glsl.on("error", (e) => {
    const error = String(e.error);
    console.error(error);
  });

  glsl.load(shader);
  glsl.loadTexture("u_input", "dcl.png", {
    filtering: "nearest",
    repeat: false
  });
  if (!played) {
    glsl.play();
  }

  window.asd = glsl;

  window.previousRendering = {
    destroy() {
      glsl.destroy();
      main.remove();
    }
  };
}
