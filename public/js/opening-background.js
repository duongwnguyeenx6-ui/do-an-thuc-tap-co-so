const vertexSource = `
attribute vec2 position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentSource = `
precision highp float;

uniform vec2 resolution;
uniform float time;
uniform float xScale;
uniform float yScale;
uniform float distortion;

void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
    float d = length(p) * distortion;
    float rx = p.x * (1.0 + d);
    float gx = p.x;
    float bx = p.x * (1.0 - d);

    float r = 0.05 / max(abs(p.y + sin((rx + time) * xScale) * yScale), 0.006);
    float g = 0.05 / max(abs(p.y + sin((gx + time) * xScale) * yScale), 0.006);
    float b = 0.05 / max(abs(p.y + sin((bx + time) * xScale) * yScale), 0.006);
    vec3 color = clamp(vec3(r, g, b) * 0.3, 0.0, 1.0);

    gl_FragColor = vec4(color, 0.94);
}
`;

let activeCanvas = null;
let animationFrame = 0;
let cleanup = null;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Không thể tạo shader WebGL.');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Không rõ lỗi biên dịch shader.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function syncOpeningBackground(canvas) {
  if (canvas === activeCanvas) return;

  animationFrame && window.cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  cleanup?.();
  cleanup = null;
  activeCanvas = canvas;
  if (!canvas) return;

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) {
    console.warn('WebGL không được hỗ trợ; hiển thị nền tĩnh cho màn hình mở đầu.');
    return;
  }

  let vertexShader;
  let fragmentShader;
  let program;
  let buffer;
  let resizeObserver;
  let motionQuery;
  let resizeHandler;
  let visibilityHandler;
  let motionHandler;

  try {
    vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) throw new Error('Không thể tạo chương trình WebGL.');
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Không thể liên kết shader WebGL.');
    }

    buffer = gl.createBuffer();
    if (!buffer) throw new Error('Không thể tạo buffer WebGL.');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]), gl.STATIC_DRAW);

    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'resolution'),
      time: gl.getUniformLocation(program, 'time'),
      xScale: gl.getUniformLocation(program, 'xScale'),
      yScale: gl.getUniformLocation(program, 'yScale'),
      distortion: gl.getUniformLocation(program, 'distortion'),
    };
    gl.uniform1f(uniforms.xScale, 1.0);
    gl.uniform1f(uniforms.yScale, 0.5);
    gl.uniform1f(uniforms.distortion, 0.05);

    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
      const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniforms.resolution, width, height);
    };

    const render = (timestamp) => {
      if (canvas !== activeCanvas || !canvas.isConnected || document.hidden) {
        animationFrame = 0;
        return;
      }
      resize();
      gl.clearColor(0.035, 0.04, 0.1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.time, timestamp * 0.00022);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrame = motionQuery.matches ? 0 : window.requestAnimationFrame(render);
    };

    const startAnimation = () => {
      if (!animationFrame && !document.hidden) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };
    resizeHandler = () => {
      resize();
      if (motionQuery.matches && !document.hidden) render(0);
    };
    visibilityHandler = () => {
      if (document.hidden) {
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else if (motionQuery.matches) {
        render(0);
      } else {
        startAnimation();
      }
    };
    motionHandler = () => {
      if (motionQuery.matches) {
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        render(0);
      } else {
        startAnimation();
      }
    };

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener('resize', resizeHandler, { passive: true });
    document.addEventListener('visibilitychange', visibilityHandler);
    motionQuery.addEventListener('change', motionHandler);
    resize();
    if (motionQuery.matches) render(0);
    else startAnimation();

    cleanup = () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      motionQuery.removeEventListener('change', motionHandler);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  } catch (error) {
    console.error('Không thể khởi tạo nền WebGL cho màn hình mở đầu:', error);
    resizeObserver?.disconnect();
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
  }
}

export { syncOpeningBackground };
