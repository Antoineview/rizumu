const scene = document.querySelector('.scene');
const canvas = document.querySelector('.characters');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
if (gl) start();

function start() {
  // Solid contour walls join two faces, instead of stacking text planes.
  const program = gl.createProgram();
  const sources = [
    [gl.VERTEX_SHADER, `
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;
      attribute float face;
      uniform vec2 viewport;
      uniform float size;
      uniform vec3 translation;
      uniform vec3 rotation;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vFace;
      vec3 rotate(vec3 p) {
        float c = cos(rotation.z), s = sin(rotation.z);
        p.xy = mat2(c, s, -s, c) * p.xy;
        c = cos(rotation.y); s = sin(rotation.y);
        p.xz = mat2(c, -s, s, c) * p.xz;
        c = cos(rotation.x); s = sin(rotation.x);
        p.yz = mat2(c, s, -s, c) * p.yz;
        return p;
      }
      void main() {
        vec3 p = rotate(position * vec3(size, size, 1.0)) + translation;
        float w = 1.0 - p.z / 1000.0;
        gl_Position = vec4(2.0 * p.xy / viewport, -p.z / 2000.0, w);
        vUv = uv;
        vNormal = rotate(normal);
        vFace = face;
      }
    `],
    [gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D glyph;
      uniform vec3 sideColor;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vFace;
      void main() {
        if (vFace > 0.5) {
          vec4 texel = texture2D(glyph, vUv);
          if (texel.a < 0.5) discard;
          gl_FragColor = vec4(texel.rgb, 1.0);
        } else {
          float light = 0.78 + 0.22 * abs(dot(normalize(vNormal), normalize(vec3(-0.4, 0.7, 0.6))));
          gl_FragColor = vec4(sideColor * light * 0.65, 1.0);
        }
      }
    `]
  ];
  for (const [type, source] of sources) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return;
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);
  const attributes = ['position', 'normal', 'uv', 'face'].map(name => gl.getAttribLocation(program, name));
  const uniforms = Object.fromEntries(['viewport', 'size', 'translation', 'rotation', 'sideColor'].map(name => [name, gl.getUniformLocation(program, name)]));
  const meshes = [...document.querySelectorAll('[data-glyph]')].map(createGlyph);
  scene.classList.add('ready');
  let elapsed = 0;
  let previousTime = null;
  let frame;

  function render() {
    const width = scene.clientWidth, height = scene.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(uniforms.viewport, width, height);
    gl.uniform1f(uniforms.size, Math.max(86, Math.min(window.innerWidth * .13, 168)));
    const tilt = -12 * Math.PI / 180;
    meshes.forEach((mesh, index) => {
      const angle = elapsed / 9000 + index * Math.PI * 2 / 3;
      const x = Math.cos(angle) * width * .32;
      const y = Math.sin(angle) * height * .19;
      gl.uniform3f(uniforms.translation, x * Math.cos(tilt) - y * Math.sin(tilt), -(x * Math.sin(tilt) + y * Math.cos(tilt)), Math.sin(angle) * 120);
      gl.uniform3f(uniforms.rotation, -10 * Math.PI / 180, (elapsed / 85 + index * 30 - 20) * Math.PI / 180, 8 * Math.PI / 180);
      gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
      gl.uniform3fv(uniforms.sideColor, mesh.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      let offset = 0;
      [3, 3, 2, 1].forEach((count, i) => {
        gl.enableVertexAttribArray(attributes[i]);
        gl.vertexAttribPointer(attributes[i], count, gl.FLOAT, false, 36, offset);
        offset += count * 4;
      });
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    });
  }

  function tick(time) {
    if (previousTime !== null) elapsed += Math.min(time - previousTime, 64);
    previousTime = time;
    render();
    frame = requestAnimationFrame(tick);
  }
  function updateMotion() {
    cancelAnimationFrame(frame);
    previousTime = null;
    render();
    if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(tick);
  }
  reducedMotion.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', updateMotion);
  window.addEventListener('resize', render);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    scene.classList.remove('ready');
  });
  updateMotion();
}

function createGlyph(design) {
  const resolution = 384;
  const image = document.createElement('canvas');
  image.width = image.height = resolution;
  const ctx = image.getContext('2d', { willReadFrequently: true });
  // Use the supplied logo paths and colors exactly, with a common scale.
  const scale = resolution / 64;
  ctx.translate(resolution / 2 - Number(design.dataset.center) * scale, resolution / 2 - 28.5 * scale);
  ctx.scale(scale, scale);
  for (const path of design.querySelectorAll('path')) {
    ctx.fillStyle = path.getAttribute('fill');
    ctx.fill(new Path2D(path.getAttribute('d')));
  }
  const color = design.dataset.color.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255);
  const pixels = ctx.getImageData(0, 0, resolution, resolution).data;
  const alpha = (x, y) => pixels[(y * resolution + x) * 4 + 3] / 255;
  const vertices = [];
  const vertex = (x, y, z, nx, ny, nz, u, v, face) => vertices.push(x, y, z, nx, ny, nz, u, v, face);

  // Matching front and back caps, cut to the supplied logo silhouette.
  for (const z of [-9, 9]) {
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
      vertex(u - .5, v - .5, z, 0, 0, Math.sign(z), u, v, 1);
    }
  }
  // Trace the antialiased outline, then extrude each segment into a solid wall.
  // Holes and detached marks get their own walls as well.
  for (let y = 0; y < resolution - 1; y++) {
    for (let x = 0; x < resolution - 1; x++) {
      const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
      const values = corners.map(([cx, cy]) => alpha(cx, cy));
      const intersections = [];
      for (let edge = 0; edge < 4; edge++) {
        const next = (edge + 1) % 4;
        if ((values[edge] >= .5) === (values[next] >= .5)) continue;
        const t = (.5 - values[edge]) / (values[next] - values[edge]);
        intersections.push([
          (corners[edge][0] + t * (corners[next][0] - corners[edge][0]) + .5) / resolution - .5,
          .5 - (corners[edge][1] + t * (corners[next][1] - corners[edge][1]) + .5) / resolution
        ]);
      }
      if (intersections.length === 4 && (values.reduce((a, b) => a + b) / 4 >= .5) === (values[0] >= .5)) {
        intersections.push(intersections.shift());
      }
      for (let i = 0; i < intersections.length; i += 2) {
        const a = intersections[i], b = intersections[i + 1];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const length = Math.hypot(dx, dy);
        if (!length) continue;
        for (const [point, z] of [[a, -9], [b, -9], [b, 9], [a, -9], [b, 9], [a, 9]]) {
          vertex(point[0], point[1], z, -dy / length, dx / length, 0, 0, 0, 0);
        }
      }
    }
  }
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { buffer, texture, color, count: vertices.length / 9 };
}
