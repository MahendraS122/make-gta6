import { vec, blocked } from './stage.js';

export function route(origin, destination, radius = .45) {
	const spacing = 3, span = 67;
	const cell = position => [Math.max(0, Math.min(span - 1, Math.round((position.x + 99) / spacing))), Math.max(0, Math.min(span - 1, Math.round((position.z + 99) / spacing)))];
	const point = (column, row) => vec(column * spacing - 99, 0, row * spacing - 99);
	const [startColumn, startRow] = cell(origin), [endColumn, endRow] = cell(destination);
	const index = (column, row) => row * span + column;
	const start = index(startColumn, startRow), end = index(endColumn, endRow);
	const open = [start], previous = new Map(), costs = new Map([[start, 0]]), scores = new Map([[start, 0]]), closed = new Set();
	let best = start, bestDistance = Infinity;
	while (open.length && closed.size < 4400) {
		open.sort((first, second) => scores.get(first) - scores.get(second));
		const current = open.shift();
		if (closed.has(current)) continue;
		closed.add(current);
		const column = current % span, row = Math.floor(current / span);
		const distance = Math.hypot(column - endColumn, row - endRow);
		if (distance < bestDistance) { best = current; bestDistance = distance; }
		if (current === end || distance < 1.1) break;
		for (const [offsetX, offsetZ] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
			const nextColumn = column + offsetX, nextRow = row + offsetZ;
			if (nextColumn < 0 || nextColumn >= span || nextRow < 0 || nextRow >= span) continue;
			const nextPoint = point(nextColumn, nextRow);
			if (blocked(nextPoint.x, nextPoint.z, radius)) continue;
			if (offsetX && offsetZ && (blocked(nextPoint.x, row * spacing - 99, radius) || blocked(column * spacing - 99, nextPoint.z, radius))) continue;
			const next = index(nextColumn, nextRow), cost = costs.get(current) + Math.hypot(offsetX, offsetZ);
			if (closed.has(next) || (costs.has(next) && costs.get(next) <= cost)) continue;
			previous.set(next, current); costs.set(next, cost); scores.set(next, cost + Math.hypot(nextColumn - endColumn, nextRow - endRow)); open.push(next);
		}
	}
	const path = [];
	while (best !== start && previous.has(best)) { path.push(point(best % span, Math.floor(best / span))); best = previous.get(best); }
	path.reverse();
	if (!blocked(destination.x, destination.z, radius)) path.push(destination.clone());
	return path;
}
