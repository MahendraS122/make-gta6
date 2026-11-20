import { THREE, scene, vec, box, ball, tube, lightMaterial, slide, clamp, blocked } from './stage.js';
import { cars, car, pedestrians, damageCar } from './actors.js';

export const patrols = [], blocks = [], pickups = [];
let quiet = 0, hurtTimer = 0, attackTimer = 0;
const helicopter = new THREE.Group();
scene.add(helicopter); helicopter.visible = false;
ball(helicopter, '#2a4049', 0, 0, 0, 1.45, .9, 2.7);
ball(helicopter, '#719493', 0, .1, 1.4, 1.1, .68, 1.2);
box(helicopter, '#293a41', 0, .1, -4, .35, .4, 5.3);
box(helicopter, '#30444b', 0, .5, -6.5, .15, 1.5, 1.4);
const rotor = box(helicopter, '#20333b', 0, 1.25, 0, 8, .09, .19);
box(helicopter, '#20333b', 0, 1.25, 0, .19, .09, 8);
for (const side of [-1, 1]) box(helicopter, '#24323a', side * 1.1, -1, 0, .12, .12, 4.2);
const spotlight = new THREE.SpotLight('#e4f6e8', 110, 65, .42, .55, 1);
spotlight.position.set(0, -.8, 1.4); helicopter.add(spotlight); scene.add(spotlight.target);
const lightCone = new THREE.Mesh(new THREE.ConeGeometry(6, 22, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#c9eee0', transparent: true, opacity: .055, depthWrite: false, side: THREE.DoubleSide }));
lightCone.position.y = -11.5; helicopter.add(lightCone);

function weaponPickup(x, z, kind) {
	const root = new THREE.Group(); root.position.set(x, .3, z); scene.add(root);
	tube(root, lightMaterial('#a9d8bf'), 0, -.22, 0, .8, .04, false);
	if (kind === 'BAT') { const bat = tube(root, '#d7ba80', 0, .65, 0, .09, 1.5); bat.rotation.z = -.5; }
	else { box(root, '#b3c9c5', 0, .5, 0, .65, .16, .18); box(root, '#434f54', -.19, .3, 0, .16, .45, .18); }
	pickups.push({ root, kind, available: true });
}
weaponPickup(-11.4, 5, 'BAT'); weaponPickup(11.4, 32, 'PISTOL');
export function crime(state, amount) {
	state.wanted = clamp(state.wanted + amount, 0, 5); quiet = 0;
	pedestrians.forEach(npc => { if (npc.root.position.distanceTo(state.player.position) < 30) npc.fear = 12; });
}
export function action(state, notify) {
	if (attackTimer > 0 || state.health <= 0) return;
	attackTimer = .48;
	const range = state.weapon === 'PISTOL' ? 30 : state.weapon === 'BAT' ? 3.8 : 2.7;
	const damage = state.weapon === 'PISTOL' ? 38 : state.weapon === 'BAT' ? 32 : 17;
	const position = state.player.position;
	const targets = [...cars.filter(record => record.alive).map(record => ({ record, position: record.root.position })), ...pedestrians.filter(npc => npc.hp > 0).map(npc => ({ npc, position: npc.root.position }))].filter(target => target.position.distanceTo(position) < range).sort((first, second) => first.position.distanceTo(position) - second.position.distanceTo(position));
	const victim = targets[0];
	if (victim) {
		state.player.rotation.y = Math.atan2(victim.position.x - position.x, victim.position.z - position.z);
		if (victim.record) damageCar(victim.record, damage, state);
		else { victim.npc.hp -= damage; victim.npc.fear = 15; }
		state.crime(victim.record?.kind === 'police' ? 2 : 1);
	}
	if (state.weapon === 'PISTOL') {
		state.crime(1);
		const flash = ball(scene, lightMaterial('#fff1ab'), position.x, 1.4, position.z, .22, .22, .22, false);
		setTimeout(() => scene.remove(flash), 80);
	}
	if (!victim) notify(state.weapon === 'PISTOL' ? 'Gunshot reported. Dispatch is responding.' : 'No target in reach.');
}
export function updateLaw(dt, time, state, notify) {
	attackTimer = Math.max(0, attackTimer - dt); hurtTimer = Math.max(0, hurtTimer - dt);
	if (attackTimer > 0 && !state.vehicle) state.player.userData.pose(time, false, Math.sin(attackTimer / .48 * Math.PI));
	for (const pickup of pickups) {
		if (!pickup.available) continue;
		pickup.root.rotation.y += dt;
		if (pickup.root.position.distanceTo(state.player.position) < 1.8 && !state.vehicle) {
			state.weapon = pickup.kind; pickup.available = false; pickup.root.visible = false; notify(pickup.kind + ' picked up. Right click to use.');
		}
	}
	const desired = state.wanted > 0 ? Math.min(4, state.wanted + 1) : 0;
	while (patrols.filter(record => record.alive).length < desired) {
		const index = patrols.length;
		const origin = state.player.position;
		let x = clamp(origin.x + (index % 2 ? -1 : 1) * 25, -90, 90), z = clamp(origin.z + (index % 3 ? 32 : -35), -90, 90);
		if (blocked(x, z, 2)) x = index % 2 ? -5 : 5;
		patrols.push(car(x, z, '#263c4d', 'police'));
	}
	let nearest = Infinity;
	for (const patrol of patrols) {
		if (!patrol.alive) continue;
		const delta = state.player.position.clone().sub(patrol.root.position);
		const distance = delta.length(); nearest = Math.min(nearest, distance);
		patrol.flash.forEach((flash, index) => { flash.visible = (Math.floor(time * 9) + index) % 2 === 0; });
		if (state.wanted > 0) {
			const angle = Math.atan2(delta.x, delta.z);
			const turn = Math.atan2(Math.sin(angle - patrol.root.rotation.y), Math.cos(angle - patrol.root.rotation.y));
			patrol.root.rotation.y += clamp(turn, -dt * 1.9, dt * 1.9);
			patrol.speed = distance > 4 ? 9 + state.wanted * 1.5 : 0;
			slide(patrol.root.position, vec(Math.sin(patrol.root.rotation.y), 0, Math.cos(patrol.root.rotation.y)).multiplyScalar(dt * patrol.speed), 1.2);
			if (distance < 8 && hurtTimer === 0) {
				if (state.vehicle) damageCar(state.vehicle, 6 + state.wanted, state);
				else state.health -= 4 + state.wanted * 1.6;
				hurtTimer = 1.2;
				state.death = 'Caught in the crossfire.';
			}
		} else patrol.speed = 0;
	}
	if (state.wanted >= 3 && blocks.length === 0) {
		for (const side of [-1, 1]) blocks.push(car(side * 4.8, clamp(state.player.position.z + 25, -90, 90), '#273e4b', 'roadblock', Math.PI / 2));
		notify('Roadblocks deployed. Find another way out.');
	}
	if (state.wanted < 3 && blocks.length) { for (const block of blocks) { scene.remove(block.root); block.alive = false; } blocks.length = 0; }
	helicopter.visible = state.wanted >= 4;
	if (helicopter.visible) {
		helicopter.position.copy(state.player.position).add(vec(Math.cos(time * .22) * 12, 24, Math.sin(time * .22) * 12));
		helicopter.rotation.y = time * .22; rotor.rotation.y = time * 28;
		spotlight.target.position.copy(state.player.position);
	}
	if (state.wanted > 0) {
		quiet += dt * (nearest > 22 ? 1 : .12);
		if (quiet > 12) { state.wanted--; quiet = 0; notify(state.wanted ? 'Search perimeter shrinking. Keep moving.' : 'You lost the heat.'); }
	}
}
export function lawStatus() { return { patrols: patrols.length, roadblocks: blocks.length, helicopter: helicopter.visible, quiet }; }
