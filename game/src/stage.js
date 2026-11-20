import * as THREE from '../vendor/three.module.min.js';

export { THREE };
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(59, innerWidth / innerHeight, .13, 500);
export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.querySelector('#viewport').append(renderer.domElement);
addEventListener('resize', () => {
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
});

export const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = THREE.MathUtils.clamp;
export const unit = new THREE.BoxGeometry();
const sphere = new THREE.SphereGeometry(1, 12, 8);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
export const solid = color => new THREE.MeshStandardMaterial({ color, roughness: .85 });
export const lightMaterial = color => new THREE.MeshBasicMaterial({ color });
const palette = new Map();
function material(color) {
	if (typeof color === 'object') return color;
	if (!palette.has(color)) palette.set(color, solid(color));
	return palette.get(color);
}
function shape(parent, geometry, color, x, y, z, width, height, depth, shadow) {
	const mesh = new THREE.Mesh(geometry, material(color));
	mesh.position.set(x, y, z);
	mesh.scale.set(width, height, depth);
	mesh.castShadow = shadow;
	mesh.receiveShadow = true;
	parent.add(mesh);
	return mesh;
}
export const box = (parent, color, x, y, z, width, height, depth, shadow = true) => shape(parent, unit, color, x, y, z, width, height, depth, shadow);
export const ball = (parent, color, x, y, z, width, height, depth, shadow = true) => shape(parent, sphere, color, x, y, z, width, height, depth, shadow);
export const tube = (parent, color, x, y, z, radius, height, shadow = true) => shape(parent, cylinder, color, x, y, z, radius, height, radius, shadow);
export const plane = (parent, color, x, y, z, width, depth) => {
	const mesh = shape(parent, new THREE.PlaneGeometry(), color, x, y, z, width, depth, 1, false);
	mesh.rotation.x = -Math.PI / 2;
	return mesh;
};

const skyMaterial = new THREE.ShaderMaterial({
	side: THREE.BackSide, depthWrite: false,
	uniforms: { zenith: { value: new THREE.Color('#4189b7') }, horizon: { value: new THREE.Color('#bce6ec') }, disc: { value: new THREE.Color('#fff0cb') }, direction: { value: vec(-.48, .32, -.85).normalize() } },
	vertexShader: 'varying vec3 directionAt; void main(){ directionAt=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
	fragmentShader: `varying vec3 directionAt; uniform vec3 zenith,horizon,disc,direction;
	void main(){ vec3 ray=normalize(directionAt); float altitude=smoothstep(-.05,.68,ray.y);
	float separation=max(0.,dot(ray,direction)); vec3 base=mix(horizon,zenith,altitude);
	base=mix(base,disc,pow(separation,26.)*.46); base=mix(base,disc,smoothstep(.9984,.9992,separation));
	gl_FragColor=vec4(base,1.);
	#include <colorspace_fragment>
	}`,
});
export const sky = new THREE.Mesh(new THREE.SphereGeometry(365, 32, 18), skyMaterial);
sky.frustumCulled = false;
scene.add(sky);
scene.background = new THREE.Color('#bce6ec');
scene.fog = new THREE.FogExp2('#bce6ec', .007);
const ambient = new THREE.HemisphereLight('#d6f4ff', '#ad8072', 2.15);
const sun = new THREE.DirectionalLight('#fff2d6', 2.35);
sun.position.set(-32, 64, 26);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 165 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.normalBias = .075;
sun.shadow.bias = -.00025;
scene.add(ambient, sun, sun.target);
export function followLight(position) {
	const anchorX = Math.round(position.x / 12) * 12, anchorZ = Math.round(position.z / 12) * 12;
	sun.target.position.set(anchorX, 0, anchorZ);
	sun.position.copy(sun.target.position).add(vec(-32, 64, 26));
}
export function setLighting(time) {
	const presets = {
		noon: ['#438db5', '#c9e6df', '#fff3d4', 2.15, 2.35, '#d6f4ff', '#ad8072'],
		day: ['#6a9db4', '#edd0ac', '#ffc683', 1.6, 2.7, '#ffe6bf', '#ad7462'],
		night: ['#071427', '#1b3a51', '#b6d8ea', .65, .45, '#83a6d0', '#233145'],
	};
	const [zenith, horizon, disc, skyPower, sunPower, skyColor, groundColor] = presets[time];
	skyMaterial.uniforms.zenith.value.set(zenith); skyMaterial.uniforms.horizon.value.set(horizon); skyMaterial.uniforms.disc.value.set(disc);
	scene.background.set(horizon); scene.fog.color.set(horizon); scene.fog.density = time === 'night' ? .009 : .007;
	ambient.color.set(skyColor); ambient.groundColor.set(groundColor); ambient.intensity = skyPower;
	sun.color.set(disc); sun.intensity = sunPower;
}

let seed = 76542;
export function random() {
	seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
	return seed / 4294967296;
}
const cloudMat = solid('#eaf6f6');
for (let index = 0; index < 15; index++) {
	const cloud = new THREE.Group();
	const angle = index * 2.4;
	cloud.position.set(Math.cos(angle) * (130 + random() * 118), 34 + random() * 39, Math.sin(angle) * (130 + random() * 118));
	for (let puff = 0; puff < 5; puff++) ball(cloud, cloudMat, puff * 6, random() * 3, random() * 5, 8 + random() * 4, 2.3 + random() * 2.2, 5 + random() * 3, false);
	scene.add(cloud);
}

export const obstacles = [];
export function obstruct(x, z, width, depth, height) {
	obstacles.push(new THREE.Box3(vec(x - width / 2, -.25, z - depth / 2), vec(x + width / 2, height, z + depth / 2)));
}
export function blocked(x, z, radius = .45) {
	return x < -103 + radius || x > 99 - radius || z < -103 + radius || z > 105 - radius || obstacles.some(bound =>
		x > bound.min.x - radius && x < bound.max.x + radius && z > bound.min.z - radius && z < bound.max.z + radius);
}
export function slide(position, step, radius) {
	let impact = false;
	if (!blocked(position.x + step.x, position.z, radius)) position.x += step.x;
	else impact = true;
	if (!blocked(position.x, position.z + step.z, radius)) position.z += step.z;
	else impact = true;
	return impact;
}

export function person(coat = '#f09d51', pants = '#25374a', skin = '#ad7059') {
	const root = new THREE.Group();
	const shadow = ball(root, new THREE.MeshBasicMaterial({ color: '#172235', transparent: true, opacity: .23, depthWrite: false }), 0, .026, 0, .61, .025, .38, false);
	const body = new THREE.Group();
	root.add(body);
	box(body, coat, 0, 1.24, 0, .65, .77, .43);
	box(body, '#eee2cd', 0, 1.32, .221, .13, .52, .024);
	box(body, skin, 0, 1.83, .008, .47, .48, .43);
	box(body, '#222733', 0, 2.075, -.034, .48, .15, .46);
	box(body, '#222733', 0, 1.94, .218, .39, .07, .04);
	box(body, '#f4e3c7', 0, 1.31, -.225, .32, .12, .022);
	const limbs = [];
	for (const side of [-1, 1]) {
		const leg = new THREE.Group(), arm = new THREE.Group();
		leg.position.set(side * .18, .91, 0);
		arm.position.set(side * .43, 1.51, 0);
		box(leg, pants, 0, -.39, 0, .26, .74, .29);
		box(leg, '#e9e2ca', 0, -.8, .066, .27, .17, .38);
		box(arm, coat, 0, -.22, 0, .21, .46, .27);
		box(arm, skin, 0, -.51, 0, .18, .21, .22);
		body.add(leg, arm);
		limbs.push(leg, arm);
	}
	root.userData.pose = (time, moving, attack = 0) => {
		const swing = moving ? Math.sin(time * 12) * .64 : 0;
		limbs.forEach((limb, index) => { limb.rotation.x = swing * ([1, -1, -1, 1][index]); });
		limbs[3].rotation.x -= attack * 1.55;
		body.position.y = moving ? Math.abs(swing) * .12 : 0;
		shadow.rotation.y = -root.rotation.y;
	};
	return root;
}
