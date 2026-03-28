(function () {
  const canvas = document.getElementById('dither-bg');
  const gl = canvas.getContext('webgl2');
  if (!gl) return;

  const VERT = `#version 300 es
    in vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FRAG = `#version 300 es
    precision mediump float;

    uniform vec2  u_res;
    uniform float u_time;
    uniform vec3  u_color;
    uniform float u_amp;
    uniform float u_freq;
    uniform float u_speed;
    uniform float u_px;
    uniform float u_cn;

    out vec4 fragColor;

    const float bayer[16] = float[16](
       0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
      12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
       3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
      15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
    );

    void main() {
      vec2 coord = floor(gl_FragCoord.xy / u_px) * u_px;
      vec2 uv    = coord / u_res;

      float t = u_time * u_speed * 100.0;

      float w = sin(uv.x  * u_freq * 6.28  + t * 1.00)          * u_amp
              + sin(uv.y  * u_freq * 5.50  + t * 1.40)          * u_amp * 0.70
              + sin((uv.x + uv.y)  * u_freq * 3.80 + t * 0.80)  * u_amp * 0.55
              + sin((uv.x - uv.y)  * u_freq * 4.20 - t * 0.90)  * u_amp * 0.50
              + sin(uv.y  * u_freq * 9.10  - t * 1.70 + 1.2)    * u_amp * 0.30
              + sin(uv.x  * u_freq * 11.3  - t * 2.30 + 0.7)    * u_amp * 0.22
              + sin((uv.x * 0.5 + uv.y * 1.5) * u_freq * 6.0 + t * 1.10 + 2.1) * u_amp * 0.25
              + sin((uv.x * 1.6 - uv.y * 0.4) * u_freq * 4.7 - t * 0.60 + 3.8) * u_amp * 0.20;
      w = clamp(w / (u_amp * 3.72) * 0.5 + 0.5, 0.0, 1.0);

      float c = sin(uv.y  * u_freq * 2.4  + t * 0.50 + 1.5)
              + sin((uv.x - uv.y) * u_freq * 1.9 - t * 0.38 + 2.8)
              + sin(uv.x  * u_freq * 3.1  - t * 0.28 + 0.4)
              + sin((uv.x + uv.y) * u_freq * 1.3 + t * 0.22 + 4.0) * 0.5;
      c = c / 3.5 * 0.5 + 0.5;

      float y = sin((uv.x + uv.y * 0.7) * u_freq * 1.6 - t * 0.44 + 4.1)
              + sin(uv.y  * u_freq * 2.8  + t * 0.36 + 0.6)
              + sin((uv.x * 1.3 - uv.y)  * u_freq * 2.0 - t * 0.29 + 2.2)
              + sin(uv.x  * u_freq * 1.1  - t * 0.18 + 3.5) * 0.6;
      y = y / 3.6 * 0.5 + 0.5;

      vec3 col_red    = u_color;
      vec3 col_purple = vec3(0.20, 0.0,  0.32);
      vec3 col_blue   = vec3(0.0,  0.06, 0.30);
      vec3 col_yellow = vec3(0.28, 0.20, 0.0);

      vec3 col = col_red;
      col = mix(col, col_purple, smoothstep(0.65, 0.88, c)  * 0.38);
      col = mix(col, col_blue,   smoothstep(0.30, 0.08, c)  * 0.32);
      col = mix(col, col_yellow, smoothstep(0.70, 0.92, y)  * 0.35);

      int bx = int(mod(coord.x / u_px, 4.0));
      int by = int(mod(coord.y / u_px, 4.0));
      float thresh = bayer[by * 4 + bx];

      float scaled   = w * (u_cn - 1.0);
      float dithered = (fract(scaled) > thresh) ? ceil(scaled) : floor(scaled);
      dithered = clamp(dithered / (u_cn - 1.0), 0.0, 1.0);

      fragColor = vec4(col * dithered, 1.0);
    }
  `;

  function makeShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, makeShader(gl.VERTEX_SHADER,   VERT));
  gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { return; }
  gl.useProgram(prog);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {
    res:   gl.getUniformLocation(prog, 'u_res'),
    time:  gl.getUniformLocation(prog, 'u_time'),
    color: gl.getUniformLocation(prog, 'u_color'),
    amp:   gl.getUniformLocation(prog, 'u_amp'),
    freq:  gl.getUniformLocation(prog, 'u_freq'),
    speed: gl.getUniformLocation(prog, 'u_speed'),
    px:    gl.getUniformLocation(prog, 'u_px'),
    cn:    gl.getUniformLocation(prog, 'u_cn'),
  };

  gl.uniform3f(U.color, 0.2823529411764706, 0.0, 0.0);
  gl.uniform1f(U.amp,   0.25);
  gl.uniform1f(U.freq,  3.5);
  gl.uniform1f(U.speed, 0.006);
  gl.uniform1f(U.px,    3.0);
  gl.uniform1f(U.cn,    3.0);

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.res, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  const t0 = performance.now();
  function frame() {
    gl.uniform1f(U.time, (performance.now() - t0) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }
  frame();
})();
