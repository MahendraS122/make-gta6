import { THREE, scene, vec, box, ball, tube, solid, lightMaterial, person, random, slide, clamp } from './stage.js';

export const cars = [], pedestrians = [], explosions = [];
export const carColors = ['#d97645', '#89b4af', '#e6c763', '#a5b7ce', '#704f69', '#d1cec0'];
const tires = solid('#20292e'), windows = solid('#34515e');
export function car(x, z, color, kind = 'parked', heading = 0) {
	const root = new THREE.Group();
	root.position.set(x, 0, z); root.rotation.y = heading;
	const paint = solid(color);
	box(root, '#202d34', 0, .49, 0, 1.98, .35, 4.2);
	box(root, paint, 0, .88, 0, 2.02, .65, 4.4);
	box(root, paint, 0, 1.33, -.14, 1.8, .67, 2.35);
	box(root, windows, 0, 1.46, -.08, 1.84, .44, 2.23);
	box(root, paint, 0, 1.77, -.18, 1.86, .14, 2.33);
	for (const side of [-1, 1]) {
		box(root, paint, side * .94, 1.46, -.18, .08, .55, .17);
		box(root, '#e0daca', side * 1.07, 1.3, .68, .18, .13, .3);
		box(root, '#c7c9bc', side * .64, .84, 2.22, .56, .17, .055);
		box(root, '#b04b3d', side * .68, .86, -2.23, .48, .17, .055);
	}
	box(root, '#d4d4bd', 0, .58, 2.24, 1.85, .15, .12);
	box(root, '#d4d4bd', 0, .58, -2.24, 1.85, .15, .12);
	const wheels = [];
	for (const side of [-1, 1]) for (const axle of [-1, 1]) {
		const wheel = tube(root, tires, side * 1.02, .46, axle * 1.42, .43, .25);
		wheel.rotation.z = Math.PI / 2;
		const hub = tube(root, '#d6d7c4', side * 1.17, .46, axle * 1.42, .22, .04);
		hub.rotation.z = Math.PI / 2;
		wheels.push(wheel);
	}
	const beams = [];
	for (const side of [-1, 1]) {
		const beam = new THREE.SpotLight('#fff0bd', 0, 24, .43, .6, 1.2);
		beam.position.set(side * .65, .85, 2.25);
		beam.target.position.set(side * .65, 0, 16);
		root.add(beam, beam.target); beams.push(beam);
	}
	const flash = [];
	if (kind === 'police' || kind === 'roadblock') {
		paint.color.set('#263f51');
		box(root, '#e9e4d3', 0, .96, -.18, 2.06, .24, 1.94);
		box(root, '#253440', 0, 1.91, -.18, 1.36, .15, .4);
		for (const side of [-1, 1]) flash.push(box(root, lightMaterial(side < 0 ? '#ec4e62' : '#4eb4ff'), side * .4, 2.04, -.18, .55, .2, .37));
	}
	const driver = person('#8ea49b'); driver.scale.setScalar(.6); driver.position.set(-.42, .25, .1);
	root.add(driver);
	const record = { root, paint, wheels, beams, flash, driver, kind, hp: 100, speed: 0, cooldown: 0, alive: true, route: Math.abs(x) < 10 ? 'z' : 'x', direction: heading === Math.PI ? -1 : 1 };
	root.userData.car = record;
	root.traverse(child => { child.userData.car = record; });
	cars.push(record); scene.add(root);
	return record;
}
car(5.8, 10, carColors[0]);
car(-6.1, 23, carColors[2], 'parked', Math.PI);
car(6.1, -31, carColors[1]);
export const deliveryCar = car(6.2, -51, '#e4b650');
export const chaseCar = car(-5.3, -62, '#8b527c', 'chase', Math.PI);
export const targetCar = car(6.2, 78, '#c45442', 'target');
for (let index = 0; index < 9; index++) {
	const vertical = index < 6;
	const direction = index % 2 ? 1 : -1;
	const x = vertical ? direction * -5.4 : -90 + index * 23;
	const z = vertical ? -95 + index * 32 : direction * 5.4;
	car(x, z, carColors[index % carColors.length], 'traffic', vertical ? (direction > 0 ? 0 : Math.PI) : direction * Math.PI / 2);
}
for (let index = 0; index < 22; index++) {
	const root = person(['#689ca0', '#d69a77', '#a1ab79', '#aaa4b5'][index % 4], '#3d4a50', ['#b27e66', '#d3a586', '#815744'][index % 3]);
	const side = index % 2 ? 1 : -1;
	root.position.set(side * 12.4, 0, -94 + index * 8.3);
	root.rotation.y = index % 3 ? 0 : Math.PI;
	root.scale.setScalar(.86 + random() * .14);
	scene.add(root);
	pedestrians.push({ root, hp: 70, fear: 0, cooldown: 0, direction: index % 3 ? 1 : -1 });
}

export function damageCar(record, amount, state) {
	if (!record.alive) return;
	record.hp = clamp(record.hp - amount, 0, 100);
	if (record.hp > 0) return;
	record.alive = false; record.speed = 0;
	record.paint.color.set('#302f2c');
	record.root.rotation.z = .12;
	for (let index = 0; index < 12; index++) {
		const root = ball(scene, lightMaterial(index % 2 ? '#ffbf48' : '#f46931'), record.root.position.x, 1, record.root.position.z, .8, .8, .8, false);
		explosions.push({ root, velocity: vec((random() - .5) * 7, random() * 7 + 2, (random() - .5) * 7), life: 1.5 });
	}
	if (state.vehicle === record) { state.health = 0; state.death = 'Your vehicle exploded.'; }
	else if (record.root.position.distanceTo(state.player.position) < 5) { state.health -= 40; }
}

export function updateActors(dt, time, state) {
	const position = state.player.position;
	for (const record of cars) {
		record.cooldown = Math.max(0, record.cooldown - dt);
		if (!record.alive) continue;
		if (record !== state.vehicle && ['traffic', 'chase'].includes(record.kind)) {
			const speed = record.kind === 'chase' && state.contract === 1 ? 8 : 5;
			record.speed = speed;
			record.root.position.addScaledVector(vec(Math.sin(record.root.rotation.y), 0, Math.cos(record.root.rotation.y)), dt * speed);
			if (record.root.position.z > 102) record.root.position.z = -101;
			if (record.root.position.z < -102) record.root.position.z = 101;
			if (record.root.position.x > 101) record.root.position.x = -101;
			if (record.root.position.x < -102) record.root.position.x = 100;
		}
		if (record === state.vehicle) {
			const impact = slide(record.root.position, vec(Math.sin(record.root.rotation.y), 0, Math.cos(record.root.rotation.y)).multiplyScalar(dt * record.speed), 1.2);
			if (impact && Math.abs(record.speed) > 3 && record.cooldown === 0) {
				damageCar(record, Math.abs(record.speed) * 2.1, state);
				state.health -= Math.abs(record.speed) * .25;
				record.speed *= -.2; record.cooldown = .7;
			}
		}
		record.wheels.forEach(wheel => { wheel.rotation.x += record.speed * dt / .43; });
		record.beams.forEach(beam => { beam.intensity = state.time === 'night' ? 36 : 0; });
		for (const other of cars) {
			if (other === record || !other.alive || record.cooldown > 0 || other.cooldown > 0) continue;
			if (record.root.position.distanceTo(other.root.position) < 3.25 && Math.abs(record.speed - other.speed) > 3) {
				const force = Math.abs(record.speed - other.speed);
				damageCar(record, force * 1.2, state); damageCar(other, force * 1.1, state);
				record.cooldown = other.cooldown = 1;
				if (record === state.vehicle || other === state.vehicle) state.crime(1);
				record.speed *= .35;
			}
		}
		if (!state.vehicle && record.root.position.distanceTo(position) < 1.7 && record.speed > 3 && record.cooldown === 0) {
			state.health -= 18; record.cooldown = 1.8;
		}
	}
	for (const npc of pedestrians) {
		npc.cooldown = Math.max(0, npc.cooldown - dt);
		if (npc.hp <= 0) { npc.root.rotation.z = Math.PI / 2; continue; }
		npc.fear = Math.max(0, npc.fear - dt);
		const direction = npc.fear > 0 ? npc.root.position.clone().sub(position).setY(0).normalize() : vec(0, 0, npc.direction);
		npc.root.rotation.y = Math.atan2(direction.x, direction.z);
		slide(npc.root.position, direction.multiplyScalar(dt * (npc.fear > 0 ? 5.8 : 1.3)), .35);
		if (Math.abs(npc.root.position.z) > 99) npc.direction *= -1;
		npc.root.userData.pose(time, true);
		if (state.vehicle && state.vehicle.speed > 5 && npc.cooldown === 0 && npc.root.position.distanceTo(position) < 1.8) {
			npc.hp -= 80; npc.cooldown = 2; state.crime(1);
		}
	}
	for (let index = explosions.length - 1; index >= 0; index--) {
		const effect = explosions[index]; effect.life -= dt;
		effect.root.position.addScaledVector(effect.velocity, dt);
		effect.velocity.y -= 10 * dt;
		effect.root.scale.setScalar(Math.max(.01, effect.life));
		if (effect.life <= 0) { scene.remove(effect.root); explosions.splice(index, 1); }
	}
}
