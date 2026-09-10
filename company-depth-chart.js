import * as THREE from './assets/vendor/three/three.module.min.js';

// Chart.js owns values, axes and hit testing; Three.js draws only the data geometry.
export function mountCompanyDepthChart(chart) {
  if (!Array.isArray(chart.config.plugins)) throw new Error('Chart plugin array is required');
  const host = chart.canvas.parentElement;
  const originalGrid = Object.fromEntries(Object.entries(chart.options.scales).map(([key, scale]) => [key, scale.grid.drawOnChartArea]));
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'company-depth-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);
  host.classList.add('company-depth-active');
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, .1, 2000);
  camera.position.z = 1000;
  scene.add(new THREE.AmbientLight(0xffffff, .85));
  const light = new THREE.DirectionalLight(0xffffff, 1.7);
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xa8d9ef, 1.2);
  scene.add(rim);
  let group = new THREE.Group();
  scene.add(group);
  let disposed = false;
  let frame = 0;
  let animationFrame = 0;
  let firstPaint = true;
  let hovered = -1;
  let bars = [];
  let highlightedMaterials = [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clearGeometry() {
    scene.remove(group);
    group.traverse(object => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      materials.forEach(material => { material.map?.dispose(); material.dispose(); });
    });
    group = new THREE.Group();
    scene.add(group);
    bars = [];
    highlightedMaterials = [];
  }

  function paint() {
    if (disposed) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { if (!disposed) renderer.render(scene, camera); });
  }

  function addLine(points, color, radius = 1.8, opacity = 1) {
    if (points.length < 2) return;
    const path = new THREE.CurvePath();
    for (let index = 1; index < points.length; index++) path.add(new THREE.LineCurve3(points[index - 1], points[index]));
    const geometry = new THREE.TubeGeometry(path, Math.max(8, Math.min(512, points.length * 5)), radius, 8, false);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color, shininess: 85, transparent: opacity < 1, opacity }));
    group.add(mesh);
  }

  function rebuild() {
    if (disposed || !chart.chartArea) return;
    cancelAnimationFrame(animationFrame);
    clearGeometry();
    const { width, height, chartArea } = chart;
    renderer.setSize(width, height, false);
    camera.right = width;
    camera.top = height;
    camera.bottom = 0;
    group.scale.y = -1;
    group.position.y = height;
    camera.updateProjectionMatrix();
    light.position.set(-width * .3, height * 2, 800);
    rim.position.set(width, 0, 350);
    const depth = width < 500 ? 8 : 15;
    // Draw the grid behind the prisms, never over their lit front faces.
    const axis = Object.values(chart.scales).find(scale => scale.axis === 'y' && scale.options.display !== false);
    axis?.ticks.forEach(tick => {
      const y = axis.getPixelForValue(tick.value);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(chartArea.left, y, -20), new THREE.Vector3(chartArea.right, y, -20),
      ]);
      group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: tick.value === 0 ? 0x748278 : 0x455149, transparent: true, opacity: tick.value === 0 ? .65 : .45 })));
    });
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      if (!chart.isDatasetVisible(datasetIndex)) return;
      const meta = chart.getDatasetMeta(datasetIndex);
      const color = new THREE.Color(dataset.borderColor);
      if (meta.type === 'bar') {
        meta.data.forEach((element, dataIndex) => {
          if (dataset.data[dataIndex] == null || !Number.isFinite(Number(dataset.data[dataIndex]))) return;
          const { x, y, base, width: barWidth } = element.getProps(['x', 'y', 'base', 'width'], true);
          if (![x, y, base, barWidth].every(Number.isFinite) || Math.abs(y - base) < .1) return;
          const barHeight = Math.abs(y - base);
          const barDepth = Math.min(depth, Math.max(1, barWidth * .32));
          const geometry = new THREE.BoxGeometry(Math.max(1, barWidth - barDepth * .35), barHeight, barDepth);
          const vertices = geometry.attributes.position;
          for (let index = 0; index < vertices.count; index++) {
            const behind = barDepth / 2 - vertices.getZ(index);
            vertices.setX(index, vertices.getX(index) + behind * .72);
            vertices.setY(index, vertices.getY(index) - behind * .56);
          }
          geometry.computeVertexNormals();
          const textureCanvas = document.createElement('canvas');
          textureCanvas.width = 64;
          textureCanvas.height = 128;
          const context = textureCanvas.getContext('2d');
          const gradient = context.createLinearGradient(0, 0, 64, 128);
          gradient.addColorStop(0, color.clone().multiplyScalar(.4).getStyle());
          gradient.addColorStop(.65, color.getStyle());
          gradient.addColorStop(1, color.clone().multiplyScalar(1.05).getStyle());
          context.fillStyle = gradient;
          context.fillRect(0, 0, 64, 128);
          const texture = new THREE.CanvasTexture(textureCanvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          const materials = [.6, .75, .45, 1.15, 1, .5].map((shade, face) => new THREE.MeshPhongMaterial({
            color: face === 4 ? 0xffffff : color.clone().multiplyScalar(shade),
            map: face === 4 ? texture : null, shininess: 70, specular: 0x567d66,
          }));
          const mesh = new THREE.Mesh(geometry, materials);
          mesh.position.set(x, (y + base) / 2, 0);
          group.add(mesh);
          bars.push({ mesh, base, center: mesh.position.y });
          materials.forEach(material => highlightedMaterials.push({ material, index: dataIndex }));
        });
      } else {
        let points = [];
        const flush = () => { addLine(points, color); points = []; };
        meta.data.forEach((element, dataIndex) => {
          const value = dataset.data[dataIndex];
          if (value == null || !Number.isFinite(Number(value)) || element.skip) { flush(); return; }
          const {x, y} = element.getProps(['x', 'y'], true);
          points.push(new THREE.Vector3(x, y, 25));
          if (meta.data.length > 32 && dataIndex !== meta.data.length - 1) return;
          const material = new THREE.MeshPhongMaterial({ color, shininess: 110, specular: 0xffffff });
          const point = new THREE.Mesh(new THREE.SphereGeometry(width < 500 ? 3.4 : 4.5, 16, 12), material);
          point.position.set(x, y, 25);
          group.add(point);
          highlightedMaterials.push({ material, index: dataIndex });
        });
        flush();
      }
    });
    chart.$companyDepth.geometryCount = group.children.length;
    if (firstPaint && !reducedMotion) {
      firstPaint = false;
      const start = performance.now();
      const animate = now => {
        if (disposed) return;
        const progress = Math.min(1, (now - start) / 520);
        const eased = 1 - (1 - progress) ** 3;
        bars.forEach(({mesh, base, center}) => { mesh.scale.y = Math.max(.001, eased); mesh.position.y = base + (center - base) * eased; });
        renderer.render(scene, camera);
        if (progress < 1) animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    } else paint();
  }

  function destroy() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    cancelAnimationFrame(animationFrame);
    clearGeometry();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    host.classList.remove('company-depth-active');
    if (chart.$companyDepth) chart.$companyDepth.active = false;
    Object.entries(originalGrid).forEach(([key, value]) => { if (chart.options.scales[key]) chart.options.scales[key].grid.drawOnChartArea = value; });
  }

  chart.$companyDepth = { active: true, destroy, geometryCount: 0 };
  chart.config.plugins.push({
    id: 'companyChartDepth',
    beforeDatasetsDraw() { if (!disposed) return false; },
    afterUpdate() { rebuild(); },
    afterEvent(current) {
      const index = current.getActiveElements()[0]?.index ?? -1;
      if (hovered === index) return;
      hovered = index;
      highlightedMaterials.forEach(({material, index: pointIndex}) => {
        material.emissive.setHex(pointIndex === index ? 0x213a2d : 0x000000);
      });
      paint();
    },
    afterDestroy() { destroy(); },
  });
  Object.values(chart.options.scales).forEach(scale => { if (scale.axis !== 'x') scale.grid.drawOnChartArea = false; });
  chart.update('none');
  return chart.$companyDepth;
}
