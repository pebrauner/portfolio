/* =========================================================
   LINEWORK EARTH — 3D globe of cities visited for work
   Pedro Brauner · works both embedded and standalone
   ========================================================= */

(function () {
  'use strict';

  const canvas = document.getElementById('globe-canvas');
  if (!canvas) return;
  if (typeof THREE === 'undefined') {
    console.warn('[globe] three.js not loaded');
    return;
  }

  /* City data — name + lat + lon */
  const CITIES = [
    { name: "Madrid", lat: 40.4168, lon: -3.7038 },
    { name: "Barcelona", lat: 41.3851, lon: 2.1734 },
    { name: "Lisbon", lat: 38.7223, lon: -9.1393 },
    { name: "Toledo", lat: 39.8628, lon: -4.0273 },
    { name: "Frankfurt am Main", lat: 50.1109, lon: 8.6821 },
    { name: "Paris", lat: 48.8566, lon: 2.3522 },
    { name: "Berlin", lat: 52.5200, lon: 13.4050 },
    { name: "Amsterdam", lat: 52.3676, lon: 4.9041 },
    { name: "Florence", lat: 43.7696, lon: 11.2558 },
    { name: "Rome", lat: 41.9028, lon: 12.4964 },
    { name: "Prague", lat: 50.0755, lon: 14.4378 },

    { name: "Mexico City", lat: 19.4326, lon: -99.1332 },
    { name: "Acapulco", lat: 16.8531, lon: -99.8237 },
    { name: "Miami", lat: 25.7617, lon: -80.1918 },
    { name: "Kansas City", lat: 39.0997, lon: -94.5786 },
    { name: "Atlanta", lat: 33.7490, lon: -84.3880 },
    { name: "Dallas", lat: 32.7767, lon: -96.7970 },
    { name: "Austin", lat: 30.2672, lon: -97.7431 },
    { name: "Houston", lat: 29.7604, lon: -95.3698 },
    { name: "New York City", lat: 40.7128, lon: -74.0060 },
    { name: "Orlando", lat: 28.5383, lon: -81.3792 },

    { name: "Montevideo", lat: -34.9011, lon: -56.1645 },
    { name: "Porto Alegre", lat: -30.0346, lon: -51.2177 },
    { name: "Florianópolis", lat: -27.5954, lon: -48.5480 },
    { name: "Curitiba", lat: -25.4284, lon: -49.2733 },
    { name: "São Paulo", lat: -23.5505, lon: -46.6333 },
    { name: "Rio de Janeiro", lat: -22.9068, lon: -43.1729 },
    { name: "Asunción", lat: -25.2637, lon: -57.5759 },
    { name: "Santiago", lat: -33.4489, lon: -70.6693 },
    { name: "Lima", lat: -12.0464, lon: -77.0428 },
    { name: "Bogotá", lat: 4.7110, lon: -74.0721 },
    { name: "Oranjestad", lat: 12.5211, lon: -70.0355 },

    { name: "Bangkok", lat: 13.7563, lon: 100.5018 },
    { name: "Seoul", lat: 37.5665, lon: 126.9780 },

    { name: "Doha", lat: 25.2854, lon: 51.5310 },
    { name: "Riyadh", lat: 24.7136, lon: 46.6753 },
  ];

  const CFG = {
    radius: 2,
    graticuleStep: 15,
    dotSize: 0.028,
    pinLength: 0.12,
    autoRotateSpeed: 0.0018,
    idleResumeMs: 2500,
    initialLon: -60,
    colors: {
      grat: 0xe03418,
      emphasis: 0xff5c2b,
      outline: 0xe03418,
      dot: 0xff5c2b,
    },
    opacity: {
      grat: 0.10,
      emphasis: 0.28,
      outline: 0.62,
    },
    fill: {
      alpha: 0.35,
      texWidth: 2048,
      texHeight: 1024,
    },
    geojsonUrl: 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson',
  };

  const VISITED_ISO = new Set([
    "ESP", "PRT", "DEU", "FRA", "NLD", "ITA", "CZE",
    "MEX", "USA",
    "URY", "BRA", "PRY", "CHL", "PER", "COL", "ABW",
    "THA", "KOR", "QAT", "SAU",
  ]);

  function latLonToVec3(lat, lon, r = CFG.radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = lon * Math.PI / 180;
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      -r * Math.sin(phi) * Math.sin(theta)
    );
  }

  /* Scene setup */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const globe = new THREE.Group();
  scene.add(globe);
  globe.rotation.y = (-CFG.initialLon - 90) * Math.PI / 180;

  /* Graticule */
  (function buildGraticule() {
    const segs = 128;
    const stepDeg = CFG.graticuleStep;

    const matStd = new THREE.LineBasicMaterial({
      color: CFG.colors.grat,
      transparent: true,
      opacity: CFG.opacity.grat,
    });
    const matEmph = new THREE.LineBasicMaterial({
      color: CFG.colors.emphasis,
      transparent: true,
      opacity: CFG.opacity.emphasis,
    });

    for (let lat = -90 + stepDeg; lat < 90; lat += stepDeg) {
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const lon = (i / segs) * 360 - 180;
        pts.push(latLonToVec3(lat, lon));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = (lat === 0) ? matEmph : matStd;
      globe.add(new THREE.Line(g, mat));
    }

    for (let lon = -180; lon < 180; lon += stepDeg) {
      const pts = [];
      for (let i = 0; i <= segs / 2; i++) {
        const lat = (i / (segs / 2)) * 180 - 90;
        pts.push(latLonToVec3(lat, lon));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = (lon === 0) ? matEmph : matStd;
      globe.add(new THREE.Line(g, mat));
    }
  })();

  /* Base sphere with visited-country fill texture */
  const fillCanvas = document.createElement('canvas');
  fillCanvas.width = CFG.fill.texWidth;
  fillCanvas.height = CFG.fill.texHeight;
  const fillCtx = fillCanvas.getContext('2d');
  fillCtx.fillStyle = '#0a0a0a';
  fillCtx.fillRect(0, 0, fillCanvas.width, fillCanvas.height);

  const fillTex = new THREE.CanvasTexture(fillCanvas);
  fillTex.minFilter = THREE.LinearFilter;
  fillTex.magFilter = THREE.LinearFilter;

  const baseSphere = new THREE.Mesh(
    new THREE.SphereGeometry(CFG.radius * 0.998, 96, 64),
    new THREE.MeshBasicMaterial({ map: fillTex })
  );
  globe.add(baseSphere);

  /* Cities — pin lines + tip dots */
  const pinSegPositions = [];
  const tipPositions = [];
  const cityVectors = [];
  CITIES.forEach(c => {
    const foot = latLonToVec3(c.lat, c.lon, CFG.radius * 1.0);
    const tipR = CFG.radius * 1.0 + CFG.pinLength;
    const tip  = latLonToVec3(c.lat, c.lon, tipR);
    pinSegPositions.push(foot.x, foot.y, foot.z, tip.x, tip.y, tip.z);
    tipPositions.push(tip.x, tip.y, tip.z);
    cityVectors.push(tip);
  });

  const pinGeo = new THREE.BufferGeometry();
  pinGeo.setAttribute('position', new THREE.Float32BufferAttribute(pinSegPositions, 3));
  const pinMat = new THREE.LineBasicMaterial({
    color: CFG.colors.dot,
    transparent: true,
    opacity: 0.78,
  });
  globe.add(new THREE.LineSegments(pinGeo, pinMat));

  const cityGeo = new THREE.BufferGeometry();
  cityGeo.setAttribute('position', new THREE.Float32BufferAttribute(tipPositions, 3));
  const cityMat = new THREE.PointsMaterial({
    color: CFG.colors.dot,
    size: CFG.dotSize,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1.0,
    depthTest: true,
  });
  const cityPoints = new THREE.Points(cityGeo, cityMat);
  globe.add(cityPoints);

  /* Countries — outlines + visited fills */
  function isoOf(feat) {
    const p = feat.properties || {};
    return p.ADM0_A3 || p.ISO_A3_EH || p.ISO_A3 || null;
  }

  function subdivideRing(ring, maxDegStep = 3) {
    const R = CFG.radius * 1.002;
    const out = [];
    for (let i = 0; i < ring.length; i++) {
      const [lon, lat] = ring[i];
      out.push(latLonToVec3(lat, lon, R));
      if (i < ring.length - 1) {
        const [lon2, lat2] = ring[i + 1];
        const dLon = lon2 - lon, dLat = lat2 - lat;
        const dist = Math.hypot(dLon, dLat);
        if (dist > maxDegStep) {
          const subs = Math.ceil(dist / maxDegStep);
          for (let s = 1; s < subs; s++) {
            const t = s / subs;
            out.push(latLonToVec3(lat + dLat * t, lon + dLon * t, R));
          }
        }
      }
    }
    return out;
  }

  function paintRingOnCanvas(ctx, ring) {
    const W = CFG.fill.texWidth, H = CFG.fill.texHeight;
    ctx.beginPath();
    for (let i = 0; i < ring.length; i++) {
      const [lon, lat] = ring[i];
      const x = ((lon + 180) / 360) * W;
      const y = ((90 - lat) / 180) * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function buildCountries(geojson) {
    const outlineMat = new THREE.LineBasicMaterial({
      color: CFG.colors.outline,
      transparent: true,
      opacity: CFG.opacity.outline,
    });

    let visitedCount = 0;

    for (const feat of geojson.features) {
      const iso = isoOf(feat);
      const visited = iso && VISITED_ISO.has(iso);
      if (visited) visitedCount++;

      const geom = feat.geometry;
      if (!geom) continue;
      const polys = (geom.type === 'Polygon') ? [geom.coordinates]
                 : (geom.type === 'MultiPolygon') ? geom.coordinates
                 : [];

      for (const poly of polys) {
        if (visited) {
          for (let r = 0; r < poly.length; r++) {
            if (r === 0) {
              fillCtx.fillStyle = `rgba(224, 52, 24, ${CFG.fill.alpha})`;
              paintRingOnCanvas(fillCtx, poly[r]);
            } else {
              fillCtx.fillStyle = '#0a0a0a';
              paintRingOnCanvas(fillCtx, poly[r]);
            }
          }
        }

        for (const ring of poly) {
          const pts = subdivideRing(ring);
          if (pts.length < 2) continue;
          const g = new THREE.BufferGeometry().setFromPoints(pts);
          globe.add(new THREE.Line(g, outlineMat));
        }
      }
    }

    fillTex.needsUpdate = true;

    const label = document.getElementById('variantLabel');
    if (label) label.textContent = `GRATICULE + ${geojson.features.length} COUNTRIES`;
    const hover = document.getElementById('hoverInfo');
    if (hover) hover.innerHTML = `${visitedCount} visited · drag to rotate · hover pins`;
  }

  fetch(CFG.geojsonUrl)
    .then(r => r.json())
    .then(buildCountries)
    .catch(err => {
      console.warn('[globe] country GeoJSON failed:', err);
      const label = document.getElementById('variantLabel');
      if (label) label.textContent = 'GRATICULE ONLY (offline)';
    });

  /* Interaction */
  let isDragging = false;
  const lastPointer = { x: 0, y: 0 };
  let lastInteractionAt = 0;
  const DRAG_SPEED = 0.005;

  function setStatus(s) {
    const el = document.getElementById('statusText');
    if (el) el.textContent = s;
  }

  function onPointerDown(e) {
    isDragging = true;
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;
    lastInteractionAt = performance.now();
    setStatus('DRAG MODE');
  }
  function onPointerMove(e) {
    updateHover(e);
    if (!isDragging) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;
    globe.rotation.y += dx * DRAG_SPEED;
    globe.rotation.x += dy * DRAG_SPEED;
    globe.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, globe.rotation.x));
    lastInteractionAt = performance.now();
  }
  function onPointerUp() {
    isDragging = false;
    lastInteractionAt = performance.now();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  /* Hover */
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = CFG.dotSize * 0.9;
  const mouseNDC = new THREE.Vector2();
  const tooltip = document.getElementById('tooltip');
  const tooltipName = tooltip ? tooltip.querySelector('.name') : null;
  const tooltipCoords = tooltip ? tooltip.querySelector('.coords') : null;
  let hoveredIndex = -1;

  function updateHover(e) {
    const rect = canvas.getBoundingClientRect();
    const insideCanvas =
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top  && e.clientY <= rect.bottom;

    if (!insideCanvas) {
      hoveredIndex = -1;
      if (tooltip) tooltip.classList.remove('on');
      return;
    }

    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);

    const hits = raycaster.intersectObject(cityPoints, false);
    let bestIdx = -1;
    let bestDist = Infinity;
    for (const h of hits) {
      const idx = h.index;
      if (idx == null) continue;
      const worldPos = cityVectors[idx].clone().applyMatrix4(globe.matrixWorld);
      const centerToPt = worldPos.clone();
      const camToCenter = camera.position.clone().negate();
      if (centerToPt.dot(camToCenter) > 0) continue;
      if (h.distance < bestDist) {
        bestDist = h.distance;
        bestIdx = idx;
      }
    }

    hoveredIndex = bestIdx;

    if (bestIdx >= 0 && tooltip) {
      const c = CITIES[bestIdx];
      tooltipName.textContent = c.name.toUpperCase();
      tooltipCoords.textContent = `${c.lat.toFixed(2)}°, ${c.lon.toFixed(2)}°`;
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY}px`;
      tooltip.classList.add('on');
      canvas.style.cursor = 'pointer';
    } else if (tooltip) {
      tooltip.classList.remove('on');
      canvas.style.cursor = 'crosshair';
    }
  }

  /* Resize — uses canvas container dimensions so it works embedded or fullscreen */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(canvas);
  }
  window.addEventListener('resize', resize);
  resize();

  /* Lazy render — only animate when canvas is visible on screen */
  let isVisible = true;
  if ('IntersectionObserver' in window) {
    isVisible = false;
    new IntersectionObserver((entries) => {
      for (const e of entries) isVisible = e.isIntersecting;
    }, { threshold: 0.01 }).observe(canvas);
  }

  function animate(now) {
    if (isVisible) {
      const idleFor = now - lastInteractionAt;
      const hoveringCity = hoveredIndex >= 0;

      if (hoveringCity && !isDragging) {
        setStatus('PAUSED');
      } else if (!isDragging && idleFor > CFG.idleResumeMs) {
        globe.rotation.y += CFG.autoRotateSpeed;
        setStatus('AUTO-ROTATE');
      }
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
