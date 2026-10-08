const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function whaleTier() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width <= 700 || (width <= 940 && height <= 500)) return 'phone';
    if (width < 1400) return 'tablet';
    return 'desk';
}

function makeRenderer(THREE, canvas) {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(1);
    return renderer;
}

function resizeRenderer(renderer, camera, canvas) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function pointMaterial(THREE, vertex, fragment, uniforms) {
    return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    });
}

const POINT_VERT = `
attribute float aBright;
uniform float uTime;
uniform float uPixel;
varying float vBright;
void main() {
    vec3 p = position;
    float tail = 1.0 - smoothstep(-2.35, 0.55, p.x);
    float wag = sin(uTime * 1.2 + p.x * 0.65);
    p.y += wag * 0.24 * tail;
    p.z += cos(uTime * 0.95 + p.x * 0.45) * 0.12 * tail;
    p.y += sin(uTime * 0.55 + p.z * 1.4) * 0.02;
    float flow = 0.62 + 0.38 * sin(uTime * 1.7 - p.x * 1.25 + p.y);
    vBright = aBright * flow;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (2.45 + aBright * 3.6) * uPixel * (8.2 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
}
`;

const POINT_FRAG = `
varying float vBright;
void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.12, d);
    if (alpha < 0.02) discard;
    vec3 deep = vec3(0.02, 0.25, 0.95);
    vec3 hot = vec3(0.72, 0.97, 1.0);
    vec3 col = mix(deep, hot, clamp(vBright, 0.0, 1.0));
    gl_FragColor = vec4(col, alpha * (0.55 + vBright * 0.6));
}
`;

const RIBBON_VERT = `
attribute float aSeed;
uniform float uTime;
uniform float uPixel;
uniform float uSpread;
varying float vBright;
void main() {
    float x = position.x;
    float wave = sin(x * 0.52 - uTime * 1.05);
    float wave2 = sin(x * 1.35 - uTime * 1.7 + aSeed * 5.0);
    vec3 p = vec3(x, 2.42 + wave * 0.5 + wave2 * uSpread + position.y, position.z + wave * 0.18);
    float core = 1.0 - smoothstep(0.0, uSpread + 0.02, abs(position.y));
    vBright = core;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (1.7 + core * 4.1) * uPixel * (7.2 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
}
`;

const RIBBON_FRAG = `
uniform vec3 uNear;
uniform vec3 uFar;
varying float vBright;
void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.08, d);
    if (alpha < 0.02) discard;
    vec3 col = mix(uFar, uNear, vBright);
    gl_FragColor = vec4(col, alpha * (0.18 + vBright * 0.85));
}
`;

const BAND_VERT = `
uniform float uTime;
varying vec2 vUv;
void main() {
    vUv = uv;
    vec3 p = position;
    float wave = sin(p.x * 0.52 - uTime * 1.05);
    p.y += 2.42 + wave * 0.5;
    p.z += wave * 0.12;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const BAND_FRAG = `
varying vec2 vUv;
void main() {
    float core = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 1.8);
    float fade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    vec3 col = mix(vec3(0.05, 0.35, 1.0), vec3(0.75, 0.98, 1.0), core);
    gl_FragColor = vec4(col, core * fade * 0.55);
}
`;

const TUBE_VERT = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const TUBE_FRAG = `
uniform float uTime;
varying vec2 vUv;
void main() {
    float travel = fract(vUv.x * 2.0 - uTime * 0.18);
    float streak = smoothstep(0.0, 0.015, travel) * smoothstep(0.22, 0.02, travel);
    float pulse = 0.72 + 0.28 * sin(vUv.x * 18.0 - uTime * 2.4);
    vec3 base = vec3(0.08, 0.55, 1.0);
    vec3 hot = vec3(0.85, 0.98, 1.0);
    vec3 col = mix(base, hot, clamp(streak + pulse * 0.35, 0.0, 1.0));
    gl_FragColor = vec4(col, 0.92);
}
`;

function buildWhale(countBody) {
    const positions = [];
    const brightness = [];

    function add(x, y, z, bright) {
        positions.push(x, y, z);
        brightness.push(Math.max(0, Math.min(1, bright)));
    }

    function profile(x) {
        const t = (x + 2.55) / 5.15;
        if (t < -0.02 || t > 1.02) return null;
        const clamped = Math.min(Math.max(t, 0), 1);
        const belly = Math.pow(Math.sin(Math.PI * Math.pow(clamped, 0.78)), 0.62);
        const noseCut = t > 0.93 ? Math.max(0, (1.04 - t) / 0.11) : 1;
        const head = Math.exp(-Math.pow((clamped - 0.84) / 0.13, 2));
        const ry = Math.max(0.035, (0.05 + belly * 0.7 + head * 0.16) * noseCut);
        const rz = ry * 0.5;
        const cy = Math.sin(Math.PI * clamped) * 0.16 - 0.02;
        return { ry, rz, cy };
    }

    let safety = 0;
    while (positions.length / 3 < countBody && safety < countBody * 25) {
        safety += 1;
        const x = -2.55 + Math.random() * 5.25;
        const shape = profile(x);
        if (!shape) continue;
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random());
        const y = shape.cy + Math.sin(ang) * shape.ry * rad;
        const z = Math.cos(ang) * shape.rz * rad;
        const top = (y - (shape.cy - shape.ry)) / (shape.ry * 2);
        const bright = 0.42 + Math.pow(rad, 1.6) * 0.4 + Math.max(0, top - 0.45) * 0.45;
        add(x, y, z, bright);
    }

    const shell = Math.round(countBody * 0.16);
    for (let i = 0; i < shell; i += 1) {
        const x = -2.55 + Math.random() * 5.25;
        const shape = profile(x);
        if (!shape) continue;
        const ang = Math.random() * Math.PI * 2;
        const jitter = 0.9 + Math.random() * 0.1;
        const y = shape.cy + Math.sin(ang) * shape.ry * jitter;
        const z = Math.cos(ang) * shape.rz * jitter;
        const top = Math.sin(ang) > 0.35 ? 1 : 0.45;
        add(x, y, z, 0.5 + top * 0.5);
    }

    for (let i = 0; i < 480; i += 1) {
        const side = i % 2 === 0 ? 1 : -1;
        const u = Math.pow(Math.random(), 0.8);
        const v = (Math.random() - 0.5) * 2;
        if (Math.abs(v) > 0.85) continue;
        const x = -2.35 - u * 0.85;
        const y = side * u * 0.34 + v * 0.035;
        const z = (Math.random() - 0.5) * 0.55 * (1 - u * 0.4);
        add(x, y, z, 0.78 + u * 0.2);
    }

    for (let i = 0; i < 320; i += 1) {
        const side = i % 2 === 0 ? 1 : -1;
        const u = Math.random();
        const v = (Math.random() - 0.5) * 2;
        if (Math.abs(v) > 1 - u * 0.45) continue;
        const x = 0.15 - u * 0.95;
        const y = -0.55 - u * 0.48 + v * 0.08 * (1 - u);
        const z = side * (0.12 + u * 0.22);
        add(x, y, z, 0.7);
    }

    for (let i = 0; i < 120; i += 1) {
        const u = Math.random();
        const x = -0.35 - u * 0.28;
        const y = 0.78 + u * 0.42;
        const z = (Math.random() - 0.5) * 0.08 * (1 - u);
        add(x, y, z, 0.9);
    }

    for (const side of [-1, 1]) {
        for (let i = 0; i < 36; i += 1) {
            add(
                1.85 + (Math.random() - 0.5) * 0.05,
                0.22 + (Math.random() - 0.5) * 0.04,
                side * 0.22,
                1
            );
        }
    }

    return {
        positions: new Float32Array(positions),
        brightness: new Float32Array(brightness)
    };
}

function buildRibbon(count, spread) {
    const positions = [];
    const seeds = [];
    for (let i = 0; i < count; i += 1) {
        positions.push((Math.random() - 0.5) * 16.5, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 1.5);
        seeds.push(Math.random());
    }
    return {
        positions: new Float32Array(positions),
        seeds: new Float32Array(seeds)
    };
}

function initWhale(THREE, canvas) {
    const tier = whaleTier();
    const narrow = tier !== 'desk';
    const renderer = makeRenderer(THREE, canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 50);
    camera.position.set(0.2, 0.4, narrow ? 8.8 : 7.8);

    const whale = buildWhale(narrow ? 1100 : 2200);
    const whaleGeo = new THREE.BufferGeometry();
    whaleGeo.setAttribute('position', new THREE.BufferAttribute(whale.positions, 3));
    whaleGeo.setAttribute('aBright', new THREE.BufferAttribute(whale.brightness, 1));
    const whaleUniforms = {
        uTime: { value: reducedMotion ? 1.4 : 0 },
        uPixel: { value: renderer.getPixelRatio() }
    };
    const whalePoints = new THREE.Points(whaleGeo, pointMaterial(THREE, POINT_VERT, POINT_FRAG, whaleUniforms));
    const whaleGroup = new THREE.Group();
    whaleGroup.add(whalePoints);
    scene.add(whaleGroup);

    const ipadAnchor = { x: 2.45, y: 1.75 };
    const rayPoint = new THREE.Vector3();

    function placeWhale() {
        const tablet = whaleTier() === 'tablet';
        const portrait = tablet && window.innerWidth < window.innerHeight;
        whaleGroup.scale.setScalar(portrait ? 0.5 : tablet ? 0.8 : 1.12);
        camera.position.set(0, portrait ? 0.16 : tablet ? 0.26 : 0.35, portrait ? 10.4 : tablet ? 9.1 : 8.4);
        camera.lookAt(portrait ? 0.72 : tablet ? 1.65 : 2.05, tablet ? -0.1 : -0.12, 0);
        ipadAnchor.x = portrait ? 2.45 : 3.45;
    }
    placeWhale();

    function updateIpadAnchor() {
        if (whaleTier() !== 'tablet') return;
        const title = document.querySelector('.home-title');
        if (!title) return;
        const canvasRect = canvas.getBoundingClientRect();
        const titleRect = title.getBoundingClientRect();
        if (!canvasRect.height || !titleRect.height) return;
        const screenY = titleRect.top + titleRect.height * 0.5 - canvasRect.top;
        const ndcY = -((screenY / canvasRect.height) * 2 - 1);
        const ndcX = window.innerWidth < window.innerHeight ? 0.42 : 0.28;
        camera.updateMatrixWorld(true);
        rayPoint.set(ndcX, ndcY, 0.5).unproject(camera);
        rayPoint.sub(camera.position);
        if (Math.abs(rayPoint.z) < 1e-4) return;
        const worldY = camera.position.y + rayPoint.y * (-camera.position.z / rayPoint.z);
        if (Number.isFinite(worldY)) ipadAnchor.y = worldY;
    }

    function addRibbon(count, spread, near, far) {
        const data = buildRibbon(count, spread);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
        geo.setAttribute('aSeed', new THREE.BufferAttribute(data.seeds, 1));
        const uniforms = {
            uTime: whaleUniforms.uTime,
            uPixel: whaleUniforms.uPixel,
            uSpread: { value: spread },
            uNear: { value: new THREE.Color(near) },
            uFar: { value: new THREE.Color(far) }
        };
        scene.add(new THREE.Points(geo, pointMaterial(THREE, RIBBON_VERT, RIBBON_FRAG, uniforms)));
    }

    addRibbon(narrow ? 360 : 750, 0.42, '#bff4ff', '#1a4fe0');

    const band = new THREE.Mesh(
        new THREE.PlaneGeometry(16.5, 0.9, 16, 1),
        new THREE.ShaderMaterial({
            uniforms: { uTime: whaleUniforms.uTime },
            vertexShader: BAND_VERT,
            fragmentShader: BAND_FRAG,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            toneMapped: false
        })
    );
    scene.add(band);

    const pointer = { x: 0, y: 0 };
    const pointerTarget = { x: 0, y: 0 };
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (finePointer) {
        window.addEventListener('pointermove', (event) => {
            const rect = canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            pointerTarget.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
            pointerTarget.y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
        });
        window.addEventListener('pointerout', (event) => {
            if (!event.relatedTarget) {
                pointerTarget.x = 0;
                pointerTarget.y = 0;
            }
        });
    }

    let active = true;
    let raf = 0;
    let lastRender = 0;
    const home = document.getElementById('home');
    const clock = new THREE.Clock();

    function frame(now) {
        raf = 0;
        if (!active) return;
        if (!reducedMotion && now - lastRender < 33) {
            raf = requestAnimationFrame(frame);
            return;
        }
        lastRender = now;
        const delta = reducedMotion ? 0 : Math.min(0.05, clock.getDelta());
        whaleUniforms.uTime.value += delta;
        const follow = reducedMotion ? 1 : 1 - Math.exp(-delta * 7);
        pointer.x += (pointerTarget.x - pointer.x) * follow;
        pointer.y += (pointerTarget.y - pointer.y) * follow;

        const tablet = whaleTier() === 'tablet';
        const restX = tablet ? ipadAnchor.x : 4.7;
        const restY = tablet ? ipadAnchor.y : -0.28;
        whaleGroup.position.x = restX + pointer.x * 0.16;
        whaleGroup.position.y = restY - pointer.y * 0.2 + Math.sin(whaleUniforms.uTime.value * 0.7) * 0.045;
        whaleGroup.rotation.x = (tablet ? 0.18 : 0.2) - pointer.y * 0.22;
        whaleGroup.rotation.y = (tablet ? -0.06 : -0.08) + pointer.x * 0.42;
        whaleGroup.rotation.z = (tablet ? -0.03 : -0.04) + pointer.x * 0.08;
        renderer.render(scene, camera);
        if (!reducedMotion) raf = requestAnimationFrame(frame);
    }

    function start() {
        if (!raf) raf = requestAnimationFrame(frame);
    }

    if (home && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            active = entries[0].isIntersecting && !document.hidden;
            if (active) start();
        }, { threshold: 0.02 });
        observer.observe(home);
    }

    document.addEventListener('visibilitychange', () => {
        active = !document.hidden && (!home || home.getBoundingClientRect().bottom > 0);
        if (active) start();
    });

    function fit() {
        whaleUniforms.uPixel.value = renderer.getPixelRatio();
        placeWhale();
        resizeRenderer(renderer, camera, canvas);
        updateIpadAnchor();
    }

    window.addEventListener('resize', fit);
    if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(fit);
        observer.observe(canvas);
    }

    resizeRenderer(renderer, camera, canvas);
    updateIpadAnchor();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    document.body.classList.add('webgl-on');
    start();
}

function glowTexture(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(170, 240, 255, 0.95)');
    gradient.addColorStop(0.22, 'rgba(40, 150, 255, 0.45)');
    gradient.addColorStop(0.55, 'rgba(0, 70, 180, 0.12)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function initCraft(THREE, canvas) {
    const renderer = makeRenderer(THREE, canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
    camera.position.set(0, 0, 4.3);

    class SquircleCurve extends THREE.Curve {
        constructor(scale) {
            super();
            this.scale = scale;
        }
        getPoint(t, optionalTarget = new THREE.Vector3()) {
            const angle = t * Math.PI * 2;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const x = Math.sign(c) * Math.pow(Math.abs(c), 0.5);
            const y = Math.sign(s) * Math.pow(Math.abs(s), 0.5);
            return optionalTarget.set(x * this.scale, y * this.scale, 0);
        }
    }

    const time = { value: 0 };
    const group = new THREE.Group();
    group.rotation.set(0.48, 0.42, 0);
    scene.add(group);

    function addTube(scale, radius, opacity) {
        const geo = new THREE.TubeGeometry(new SquircleCurve(scale), 40, radius, 5, true);
        const mat = new THREE.ShaderMaterial({
            uniforms: { uTime: time },
            vertexShader: TUBE_VERT,
            fragmentShader: TUBE_FRAG,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            toneMapped: false,
            opacity
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);
        return mesh;
    }

    const outer = addTube(1.22, 0.085, 1);
    const inner = addTube(0.78, 0.018, 0.8);

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture(THREE),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.95,
        toneMapped: false
    }));
    sprite.scale.set(3.6, 3.6, 1);
    group.add(sprite);

    const dustCount = whaleTier() === 'desk' ? 160 : 90;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustBright = new Float32Array(dustCount);
    const curve = new SquircleCurve(1.22);
    for (let i = 0; i < dustCount; i += 1) {
        const point = curve.getPoint(Math.random());
        dustPositions[i * 3] = point.x + (Math.random() - 0.5) * 0.18;
        dustPositions[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.18;
        dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.28;
        dustBright[i] = 0.45 + Math.random() * 0.55;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('aBright', new THREE.BufferAttribute(dustBright, 1));
    group.add(new THREE.Points(dustGeo, pointMaterial(THREE, `
        attribute float aBright;
        uniform float uTime;
        uniform float uPixel;
        varying float vBright;
        void main() {
            vec3 p = position;
            p.z += sin(uTime + position.x * 2.0) * 0.05;
            vBright = aBright;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (1.4 + aBright * 2.2) * uPixel * (5.5 / max(1.0, -mv.z));
            gl_Position = projectionMatrix * mv;
        }
    `, POINT_FRAG, {
        uTime: time,
        uPixel: { value: renderer.getPixelRatio() }
    })));

    let active = false;
    let raf = 0;
    let lastRender = 0;
    const stage = canvas.parentElement;
    const clock = new THREE.Clock();

    function frame(now) {
        raf = 0;
        if (!active) return;
        if (!reducedMotion && now - lastRender < 33) {
            raf = requestAnimationFrame(frame);
            return;
        }
        lastRender = now;
        const delta = reducedMotion ? 0 : clock.getDelta();
        time.value += delta;
        if (!reducedMotion) {
            group.rotation.y += delta * 0.24;
            outer.rotation.z = Math.sin(time.value * 0.35) * 0.04;
            inner.rotation.z -= delta * 0.55;
        }
        renderer.render(scene, camera);
        if (!reducedMotion) raf = requestAnimationFrame(frame);
    }

    function start() {
        if (!raf) raf = requestAnimationFrame(frame);
    }

    if (stage && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            active = entries[0].isIntersecting && !document.hidden;
            if (active) start();
        }, { threshold: 0.08 });
        observer.observe(stage);
    } else {
        active = true;
        start();
    }

    window.addEventListener('resize', () => {
        resizeRenderer(renderer, camera, canvas);
    });

    resizeRenderer(renderer, camera, canvas);
    renderer.render(scene, camera);
}

async function boot() {
    const whaleCanvas = document.getElementById('whale-canvas');
    const craftCanvas = document.getElementById('craft-canvas');
    if (!whaleCanvas && !craftCanvas) return;
    if (!window.WebGLRenderingContext) {
        document.body.classList.add('webgl-off');
        return;
    }

    try {
        const THREE = await import(THREE_URL);
        const phone = window.matchMedia('(max-width: 700px), (max-width: 940px) and (max-height: 500px)');
        const startWhale = () => {
            if (!whaleCanvas || whaleTier() === 'phone' || whaleCanvas.dataset.ready) return;
            whaleCanvas.dataset.ready = '1';
            initWhale(THREE, whaleCanvas);
        };
        startWhale();
        phone.addEventListener('change', startWhale);
        if (craftCanvas) {
            const stage = craftCanvas.parentElement;
            const startCraft = () => {
                if (craftCanvas.dataset.ready) return;
                craftCanvas.dataset.ready = '1';
                initCraft(THREE, craftCanvas);
            };
            if (stage && 'IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    if (!entries.some(entry => entry.isIntersecting)) return;
                    startCraft();
                    observer.disconnect();
                }, { rootMargin: '160px' });
                observer.observe(stage);
            } else {
                startCraft();
            }
        }
    } catch (error) {
        document.body.classList.add('webgl-off');
    }
}

if ('requestIdleCallback' in window) {
    requestIdleCallback(() => boot(), { timeout: 700 });
} else {
    setTimeout(boot, 60);
}
