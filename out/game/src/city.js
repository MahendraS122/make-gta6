import { THREE, scene, vec, solid, box, ball, tube, plane, random, obstruct } from './stage.js';

const sidewalk = solid('#cbb79b'), asphalt = solid('#424d51'), lane = solid('#f0d99f'), white = solid('#efe5cd');
const windowMaterials = [];
const signs = [];
plane(scene, '#91a18a', 0, -.15, 0, 240, 240);
plane(scene, '#437e86', 0, -.12, -129, 650, 50);
plane(scene, asphalt, 0, -.045, 0, 20, 240);
plane(scene, asphalt, 0, -.044, 0, 240, 20);
plane(scene, sidewalk, -13, -.018, 0, 6, 240);
plane(scene, sidewalk, 13, -.017, 0, 6, 240);
plane(scene, sidewalk, 0, -.016, -13, 240, 6);
plane(scene, sidewalk, 0, -.015, 13, 240, 6);
for (const offset of [-2.8, 2.8]) {
	for (let lineIndex = -18; lineIndex <= 18; lineIndex++) {
		const stripe = plane(scene, lane, offset, -.025, lineIndex * 6.5, .11, 3.2);
		stripe.rotation.z = 0;
		plane(scene, lane, lineIndex * 6.5, -.024, offset, 3.2, .11);
	}
}
for (const side of [-1, 1]) {
	for (let stripe = 0; stripe < 8; stripe++) {
		plane(scene, white, side * (8.7 + (stripe % 4) * .78), -.02, 9.15 + Math.floor(stripe / 4) * 2.5, .48, 1.65);
		plane(scene, white, 9.15 + Math.floor(stripe / 4) * 2.5, -.019, side * (8.7 + (stripe % 4) * .78), 1.65, .48);
	}
}
for (let coordinate = -102; coordinate <= 102; coordinate += 24) {
	for (const side of [-1, 1]) {
		for (const axis of ['x', 'z']) {
			const x = axis === 'x' ? coordinate : side * 27;
			const z = axis === 'z' ? coordinate : side * 27;
			if (Math.abs(x) < 17 || Math.abs(z) < 17) continue;
			const width = 9 + random() * 7, depth = 9 + random() * 7;
			const height = 7 + random() * 33;
			building(x, z, width, depth, height, Math.floor(random() * 6));
		}
	}
}

function windowTexture(kind) {
	if (windowMaterials[kind]) return windowMaterials[kind];
	const canvas = document.createElement('canvas');
	canvas.width = 128;
	canvas.height = 256;
	const textureContext = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
	const walls = ['#e4bd91', '#b8b3a1', '#d09270', '#b9c6ba', '#dfd4b9', '#8d9e9b'];
	const wallColor = new THREE.Color(walls[kind]);
	textureContext.clearColor(wallColor.r, wallColor.g, wallColor.b, 1);
	textureContext.clear(textureContext.COLOR_BUFFER_BIT);
	textureContext.enable(textureContext.SCISSOR_TEST);
	const gap = kind % 2 ? 25 : 30;
	for (let y = 9; y < 253; y += 32) for (let x = 9; x < 126; x += gap) {
		const windowColor = new THREE.Color(random() > .34 ? (kind === 5 ? '#42676c' : '#597b82') : '#edcf98');
		textureContext.scissor(x, y, 13, 18);
		textureContext.clearColor(windowColor.r, windowColor.g, windowColor.b, 1);
		textureContext.clear(textureContext.COLOR_BUFFER_BIT);
		textureContext.scissor(x + 5, y, 1, 18);
		textureContext.clearColor(.87, .88, .82, 1);
		textureContext.clear(textureContext.COLOR_BUFFER_BIT);
	}
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.magFilter = THREE.NearestFilter;
	return windowMaterials[kind] = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
}
function building(x, z, width, depth, height, kind) {
	const wall = box(scene, windowTexture(kind), x, height / 2, z, width, height, depth, true);
	obstruct(x, z, width + .45, depth + .45, height);
	box(scene, ['#bd795d', '#536873', '#c29a69'][kind % 3], x, height + .2, z, width + .4, .42, depth + .4);
	for (const side of [-1, 1]) {
		box(scene, '#e4d0ad', x + side * (width / 2 - .16), height / 2, z + depth / 2 + .012, .16, height, .08, false);
		box(scene, '#e4d0ad', x + side * (width / 2 - .16), height / 2, z - depth / 2 - .012, .16, height, .08, false);
	}
	if (kind === 3 || kind === 4) {
		const sign = box(scene, '#cf5943', x, 3.15, z + depth / 2 + .09, Math.min(width - 1, 6.3), .7, .15);
		const image = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="64"><rect width="256" height="64" fill="#183a43"/><text x="128" y="45" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="bold" fill="#f9dcad">${['TIDELINE', 'MOTEL'][kind - 3]}</text></svg>`;
		const texture = new THREE.TextureLoader().load('data:image/svg+xml,' + encodeURIComponent(image)); texture.colorSpace = THREE.SRGBColorSpace;
		sign.material = new THREE.MeshBasicMaterial({ map: texture });
		signs.push(sign);
	}
}

export const lampLights = [], streetLamps = [], trees = [];
for (let index = -5; index <= 5; index++) {
	for (const side of [-1, 1]) {
		const coordinate = index * 19;
		if (Math.abs(coordinate) < 15) continue;
		const x = side * 16.5, z = coordinate;
		lamp(x, z, index % 2 === 0 ? 1 : 0);
		tree(x + side * 2.8, z + 6);
	}
}
function lamp(x, z, side) {
	const root = new THREE.Group(); root.position.set(x, 0, z); scene.add(root);
	const pole = tube(root, '#34444a', 0, 3.4, 0, .11, 6.8);
	const arm = tube(root, '#34444a', side * 1, 6.6, 0, .075, 2.1);
	arm.rotation.z = Math.PI / 2;
	const bulb = ball(root, '#fff0cb', side * 1.85, 6.47, 0, .3, .15, .36, false);
	const glow = new THREE.PointLight('#ffe6b7', 0, 15, 2);
	glow.position.copy(bulb.position);
	root.add(glow);
	lampLights.push(glow);
	streetLamps.push({ bulb, pole, arm });
}
function tree(x, z) {
	const root = new THREE.Group(); root.position.set(x, 0, z); scene.add(root);
	tube(root, '#78604c', 0, .9, 0, .2, 1.8);
	for (let tier = 0; tier < 3; tier++) {
		const leaves = tube(root, ['#456d52', '#59805b', '#6b8958'][tier], 0, 1.55 + tier * .63, 0, 1.25 - tier * .24, 1.38, true);
		leaves.geometry = new THREE.ConeGeometry(1.25 - tier * .24, 1.48, 9);
	}
	trees.push(root);
}

export function scenery(position) {
	for (const treeRoot of trees) treeRoot.rotation.y = Math.sin(performance.now() * .0008 + treeRoot.position.z) * .025;
	void position;
}
export function cityTime(time) {
	const night = time === 'night';
	for (const material of windowMaterials) {
		if (!material) continue;
		material.emissive.set(night ? '#e5bb73' : '#000000');
		material.emissiveMap = material.map;
		material.emissiveIntensity = night ? .55 : 0;
	}
	lampLights.forEach(light => { light.intensity = night ? 32 : 0; });
	streetLamps.forEach(({ bulb }) => { bulb.material = night ? new THREE.MeshBasicMaterial({ color: '#ffe7ab' }) : solid('#f3e1b6'); });
	signs.forEach(sign => { sign.material.color.set(night ? '#ffa7c7' : '#ffffff'); });
}

for (const road of [-72, 72]) {
	plane(scene, asphalt, road, -.04, 0, 13, 208);
	plane(scene, asphalt, 0, -.04, road, 208, 13);
	for (let dash = -16; dash <= 16; dash++) {
		plane(scene, lane, road, -.022, dash * 6.3, .12, 2.8);
		plane(scene, lane, dash * 6.3, -.021, road, 2.8, .12);
	}
}
for (const x of [-52, 49]) for (const z of [-49, 49]) {
	building(x, z, 12, 12, 9 + random() * 15, Math.floor(random() * 6));
	tree(x + 9, z + 8); tree(x - 10, z - 8);
}
for (let dock = -95; dock < 100; dock += 22) {
	box(scene, '#b2a58c', dock, .1, -111, 14, .35, 16);
	for (const side of [-1, 1]) tube(scene, '#6c6c5a', dock + side * 5, .6, -115, .2, 2);
}
box(scene, '#adb4a0', 28, 1.5, -96, 20, 3, 4);
box(scene, '#c7af85', 28, 3.2, -96, 20.8, .4, 5);
