import { THREE, scene, camera, renderer, vec, clamp, person, slide, blocked, obstacles, sky, followLight } from './stage.js';
import { scenery } from './city.js';
import { cars, updateActors, damageCar } from './actors.js';
import { jobs, updateBeacon } from './contracts.js';
import { notify, updateHUD } from './hud.js';
import { crime, action, updateLaw, lawStatus } from './law.js';
import { setupGarage, loadGame, changeTime, saveGame, garageStatus } from './garage.js';
import { route } from './navigation.js';

export const player = person();
player.position.set(1.4, 0, 8);
player.rotation.y = Math.PI;
scene.add(player);
export const state = { player, vehicle: null, health: 100, money: 250, wanted: 0, contract: 0, time: 'noon', death: '', weapon: 'UNARMED', crime(amount) { crime(this, amount); } };
addEventListener('southline-action', () => action(state, notify));
document.getElementById('restart').onclick = () => { localStorage.removeItem('southline-save'); location.assign(location.pathname); };
state.finishContract = () => {
	if (state.contract >= jobs.length) return;
	state.money += jobs[state.contract].reward;
	state.contract++;
	notify(`Contract complete. Payment received. ${state.contract === 5 ? 'Southline is yours.' : 'New contract unlocked.'}`);
	if (state.contract === 3) state.crime(2);
};
loadGame(state, cars);
setupGarage(state);
export function enter(record) {
	if (!record.alive) return;
	state.vehicle = record; record.driver.visible = false; player.visible = false; goal = null; path = []; pendingCar = null;
	if (record.kind === 'traffic' || record.kind === 'police') state.crime(1);
}
export function exit() {
	if (!state.vehicle) return;
	const record = state.vehicle;
	const offsets = [vec(2.7, 0, 0), vec(-2.7, 0, 0), vec(0, 0, 3.2), vec(0, 0, -3.2)];
	const spot = offsets.map(offset => offset.applyAxisAngle(vec(0, 1, 0), record.root.rotation.y).add(record.root.position)).find(point => !blocked(point.x, point.z, .45));
	if (!spot) return notify('Exit blocked. Move your vehicle into the street.');
	player.position.copy(spot);
	record.speed = 0; state.vehicle = null; player.visible = true;
}
const canvas = renderer.domElement;
const pointer = new THREE.Vector2();
const ray = new THREE.Raycaster();
const ground = new THREE.Plane(vec(0, 1, 0), 0);
const keys = new Set();
let goal = null, gesture = null, yaw = .2, pitch = .36, zoom = 23, path = [], pendingCar = null;
const focus = player.position.clone().add(vec(0, 1.25, 0));
const hits = vec();
const shot = new URLSearchParams(location.search).get('shot');
let capture = false;
if (['start', 'play', 'end'].includes(shot)) {
	player.position.set(1.4, 0, 8);
	state.health = 100; state.wanted = 0; state.contract = 0;
	changeTime({ start: 'noon', play: 'day', end: 'night' }[shot], state);
	focus.copy(player.position).add(vec(0, 1.25, 0));
	capture = true;
}

addEventListener('keydown', event => {
	if (event.target instanceof HTMLButtonElement && ['Enter', ' '].includes(event.key)) return;
	keys.add(event.key.toLowerCase());
});
addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
addEventListener('blur', () => { keys.clear(); gesture = null; });
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('wheel', event => { event.preventDefault(); zoom = clamp(zoom + Math.sign(event.deltaY) * 1.7, 7, 34); }, { passive: false });
canvas.addEventListener('pointerdown', event => {
	canvas.setPointerCapture(event.pointerId);
	gesture = { x: event.clientX, y: event.clientY, distance: 0 };
});
canvas.addEventListener('pointermove', event => {
	if (!gesture) return;
	const deltaX = event.clientX - gesture.x, deltaY = event.clientY - gesture.y;
	gesture.distance += Math.hypot(deltaX, deltaY);
	gesture.x = event.clientX; gesture.y = event.clientY;
	if (gesture.distance < 5) return;
	yaw -= deltaX * .008;
	pitch = clamp(pitch + deltaY * .006, .12, 1.05);
});
canvas.addEventListener('pointercancel', () => { gesture = null; });
canvas.addEventListener('pointerup', event => {
	const click = gesture && gesture.distance < 5;
	gesture = null;
	if (!click) return;
	const rect = canvas.getBoundingClientRect();
	pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
	ray.setFromCamera(pointer, camera);
	if (event.button === 2) { if (state.vehicle) exit(); else window.dispatchEvent(new Event('southline-action')); return; }
	const hit = ray.intersectObjects(cars.map(record => record.root), true)[0];
	if (hit && !state.vehicle) { const record = hit.object.userData.car; if (record.root.position.distanceTo(player.position) < 6) enter(record); else { pendingCar = record; path = route(player.position, record.root.position); goal = path.shift() || null; } return; }
	const point = ray.ray.intersectPlane(ground, vec());
	if (point) { pendingCar = null; path = route(player.position, point.clamp(vec(-102, 0, -102), vec(98, 0, 104)), state.vehicle ? 1.25 : .45); goal = path.shift() || null; }
});

function updatePlayer(dt, time) {
	if (pendingCar && pendingCar.root.position.distanceTo(player.position) < 4) { enter(pendingCar); pendingCar = null; path = []; }
	const direction = vec(Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')), 0, Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')));
	if (state.vehicle) {
		const record = state.vehicle;
		if (direction.lengthSq()) {
			goal = null; path = [];
			record.speed = clamp(record.speed - direction.z * dt * 12, -9, 24);
			record.root.rotation.y -= direction.x * dt * 1.65 * (record.speed < 0 ? -1 : 1);
		} else if (goal) {
			const delta = goal.clone().sub(record.root.position);
			const angle = Math.atan2(delta.x, delta.z);
			const turn = Math.atan2(Math.sin(angle - record.root.rotation.y), Math.cos(angle - record.root.rotation.y));
			record.root.rotation.y += clamp(turn, -dt * 1.7, dt * 1.7);
			record.speed = Math.min(20, delta.length() * 1.1) * Math.max(.2, 1 - Math.abs(turn) / Math.PI);
			if (delta.length() < 2.6) { goal = path.shift() || null; if (!goal) record.speed = 0; }
		} else record.speed *= Math.exp(-dt * 2);
		player.position.copy(record.root.position);
		return;
	}
	if (direction.lengthSq()) {
		goal = null; path = [];
		direction.applyAxisAngle(vec(0, 1, 0), yaw);
	} else if (goal) {
		direction.subVectors(goal, player.position);
		if (direction.length() < .65) { goal = path.shift() || null; direction.set(0, 0, 0); }
	}
	const moving = direction.lengthSq() > 0;
	if (moving) {
		player.rotation.y = Math.atan2(direction.x, direction.z);
		slide(player.position, direction.normalize().multiplyScalar(dt * 7.2), .42);
	}
	player.userData.pose(time, moving);
}

function updateCamera(dt) {
	focus.lerp(player.position.clone().add(vec(0, 1.25, 0)), 1 - Math.exp(-12 * dt));
	const offset = vec(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
	const sight = new THREE.Ray(focus, offset);
	let distance = zoom;
	for (const bound of obstacles) {
		if (sight.intersectBox(bound, hits)) distance = Math.min(distance, Math.max(.3, hits.distanceTo(focus) - .75));
	}
	camera.position.copy(focus).addScaledVector(offset, distance);
	camera.lookAt(focus);
	if (capture) {
		camera.position.set(7.5, 7.4, 30);
		camera.lookAt(vec(1.4, 1.25, 8));
	}
	sky.position.copy(camera.position);
}

let last = performance.now(), simulated = 0;
export function step(dt) {
	simulated += dt;
	if (state.health <= 0) { updateHUD(state, dt); return; }
	updatePlayer(dt, simulated);
	updateActors(dt, simulated, state);
	if (state.vehicle) player.position.copy(state.vehicle.root.position);
	updateLaw(dt, simulated, state, notify);
	updateBeacon(state, simulated);
	updateHUD(state, dt);
	updateCamera(dt);
	followLight(player.position);
	scenery(player.position);
}
window.southline = { state, cars, enter, exit, damageCar: (record, amount) => damageCar(record, amount, state), step, renderer, scene, camera, lawStatus, changeTime: time => changeTime(time, state), save: () => saveGame(state), garageStatus, route, ready: true };
renderer.setAnimationLoop(now => {
	step(clamp((now - last) / 1000, 0, .05));
	last = now;
	renderer.render(scene, camera);
});
