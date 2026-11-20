import { THREE, scene, vec, box, tube, lightMaterial, setLighting } from './stage.js';
import { cityTime } from './city.js';
import { carColors } from './actors.js';
import { notify } from './hud.js';

export const garagePosition = vec(-12, 0, -32);
const marker = tube(scene, new THREE.MeshBasicMaterial({ color: '#8adcc5', transparent: true, opacity: .32, depthWrite: false }), -12, .025, -32, 3.5, .05, false);
box(scene, '#274e4b', -18.5, 1.7, -32, 3, 3.4, 6);
box(scene, lightMaterial('#98e0ba'), -16.94, 2.6, -32, .12, .25, 5.8);
void marker;
const find = id => document.getElementById(id);
let currentState;
export function changeTime(time, state) { state.time = time; setLighting(time); cityTime(time); }
export function saveGame(state) {
	const vehicle = state.vehicle;
	const saved = { money: state.money, contract: state.contract, time: state.time, health: state.health, weapon: state.weapon, position: state.player.position.toArray(), car: vehicle ? { color: '#' + vehicle.paint.color.getHexString(), position: vehicle.root.position.toArray(), hp: vehicle.hp } : null };
	try { localStorage.setItem('southline-save', JSON.stringify(saved)); notify('City saved. Your next tide is waiting.'); return true; } catch { notify('Storage unavailable in this browser.'); return false; }
}
export function loadGame(state, cars) {
	try {
		const saved = JSON.parse(localStorage.getItem('southline-save'));
		if (!saved) return;
		state.money = Math.max(0, Number(saved.money) || 250); state.contract = Math.min(5, Math.max(0, Number(saved.contract) || 0));
		state.health = Math.max(1, Number(saved.health) || 100); state.weapon = ['BAT', 'PISTOL'].includes(saved.weapon) ? saved.weapon : 'UNARMED';
		if (Array.isArray(saved.position) && saved.position.every(Number.isFinite)) state.player.position.fromArray(saved.position);
		if (saved.car) { cars[0].paint.color.set(saved.car.color); cars[0].root.position.fromArray(saved.car.position); cars[0].hp = saved.car.hp; }
		if (['day', 'noon', 'night'].includes(saved.time)) state.time = saved.time;
	} catch { notify('Save could not be loaded. Starting a fresh city.'); }
}
function nearby(state) { return state.vehicle && state.player.position.distanceTo(garagePosition) < 8; }
export function setupGarage(state) {
	currentState = state;
	find('timeButton').onclick = () => { const times = ['noon', 'day', 'night']; changeTime(times[(times.indexOf(state.time) + 1) % 3], state); };
	find('garageButton').onclick = () => {
		find('garagePanel').hidden = !find('garagePanel').hidden;
		find('garageText').textContent = nearby(state) ? 'Welcome in. Repair your ride, pick a finish, save your city.' : 'Drive to Tideline Customs: turquoise marker at the west sidewalk, 32m north of the junction.';
	};
	find('closeGarage').onclick = () => { find('garagePanel').hidden = true; };
	find('repair').onclick = () => {
		if (!nearby(state)) return notify('Bring your car to Tideline Customs first.');
		if (state.money < 100) return notify('Repair costs $100. Complete a contract.');
		state.money -= 100; state.vehicle.hp = 100; state.health = 100; saveGame(state); notify('Fresh steel. Repaired and saved.');
	};
	find('save').onclick = () => saveGame(state);
	carColors.forEach(color => {
		const button = document.createElement('button'); button.style.background = color; button.setAttribute('aria-label', 'Paint ' + color);
		button.onclick = () => { if (!nearby(state)) return notify('Repaint available at the garage.'); state.vehicle.paint.color.set(color); saveGame(state); };
		find('swatches').append(button);
	});
	changeTime(state.time, state);
}
export function garageStatus() { return { nearby: nearby(currentState), marker: garagePosition.toArray() }; }
