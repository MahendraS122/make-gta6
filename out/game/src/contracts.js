import { THREE, scene, vec, ball, tube, lightMaterial } from './stage.js';
import { deliveryCar, chaseCar, targetCar } from './actors.js';

export const jobs = [
	{ title: 'CONTRACT 01 · SALT AIR', detail: 'Collect the sealed parcel at the harbor.', target: vec(-74, 0, -68), reward: 350 },
	{ title: 'CONTRACT 02 · REAR VIEW', detail: 'Chase the courier before they cross the bridge.', target: chaseCar.root.position, reward: 550 },
	{ title: 'CONTRACT 03 · CLEAN DELIVERY', detail: 'Take the gold coupe and bring it to the motel.', target: deliveryCar.root.position, reward: 750 },
	{ title: 'CONTRACT 04 · NO WITNESSES', detail: 'Shake the police and leave the hot blocks.', target: vec(-72, 0, 62), reward: 1000 },
	{ title: 'CONTRACT 05 · SALT IN THE WOUND', detail: 'Destroy the marked vehicle at the marina.', target: targetCar.root.position, reward: 1500 },
];
export const beacon = new THREE.Group();
scene.add(beacon);
const halo = ball(beacon, new THREE.MeshBasicMaterial({ color: '#ffe19a', transparent: true, opacity: .14, depthWrite: false }), 0, .08, 0, 1.45, .06, 1.45, false);
const stem = tube(beacon, lightMaterial('#f4c678'), 0, 2.4, 0, .095, 4.8, false);
const crown = ball(beacon, lightMaterial('#fff0bf'), 0, 4.95, 0, .37, .37, .37, false);
const flag = new THREE.Mesh(new THREE.ConeGeometry(.68, 1.35, 4), new THREE.MeshBasicMaterial({ color: '#f58c56', transparent: true, opacity: .78 }));
flag.position.set(.68, 3.8, 0); flag.rotation.z = Math.PI / 2; beacon.add(flag);
void halo; void stem; void crown;
export function updateBeacon(state, time) {
	if (state.contract >= jobs.length) { beacon.visible = false; return; }
	const job = jobs[state.contract];
	let target = job.target;
	if (state.contract === 2 && state.vehicle === deliveryCar) target = vec(71, 0, 73);
	if (state.contract === 4 && !targetCar.alive) { state.finishContract(); beacon.visible = false; return; }
	beacon.visible = state.contract < jobs.length;
	beacon.position.set(target.x, 0, target.z);
	beacon.children[2].position.y = 4.85 + Math.sin(time * 2.4) * .17;
	const distance = state.player.position.distanceTo(target);
	if (state.contract === 1 && distance < 13) { state.finishContract(); return; }
	if (distance < 3.6) {
		if (state.contract === 1 && chaseCar.root.position.distanceTo(state.player.position) > 13) return;
		if (state.contract === 2 && state.vehicle !== deliveryCar) return;
		if (state.contract === 3 && state.wanted > 0) return;
		if (state.contract === 4 && targetCar.alive) return;
		state.finishContract();
	}
}
