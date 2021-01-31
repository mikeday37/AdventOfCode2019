
export interface Point {
	x: number;
	y: number;
}

export type PointKey = string;

export function pointToKey(p: Point) : PointKey {
	return `${p.x},${p.y}`;
}

export function keyToPoint(key: PointKey) : Point {
	const [x,y] = key.split(',').map(Number);
	return {x,y};
}

/** represents a sparse grid of unlimited extent */
export class DynamicGrid<T> {
	private upperLeft: Point | undefined;
	private lowerRight: Point | undefined;
	private cells: Map<PointKey, T> = new Map();

	/** returns true iff no cell has been set */
	isEmpty() : boolean
	{
		return this.cells.size === 0;
	}

	/** sets the value of the cell at the given point, tracking bounds as needed */
	setCell(p: Point, v: T) : DynamicGrid<T>
	{
		const key = pointToKey(p);
		if (!this.cells.has(key))
		{
			if (this.isEmpty())
			{
				this.upperLeft = {x: p.x, y: p.y};
				this.lowerRight = {x: p.x, y: p.y};
			} else {
				this.upperLeft!.x = Math.min(this.upperLeft!.x, p.x);
				this.upperLeft!.y = Math.min(this.upperLeft!.y, p.y);
				this.lowerRight!.x = Math.max(this.lowerRight!.x, p.x);
				this.lowerRight!.y = Math.max(this.lowerRight!.y, p.y);
			}
		}
		this.cells.set(key, v);
		return this;
	}

	/** gets the value of the cell at the given point, or returns undefined if that point hasn't been set */
	getCell(p: Point) : T | undefined
	{
		return this.cells.get(pointToKey(p));
	}

	/** returns true iff the given cell has been set */
	hasCell(p: Point) : boolean
	{
		return this.cells.has(pointToKey(p));
	}

	/** gets the bounding rectangle of all set points, or undefined if no point has been set*/
	getBounds()
	{
		if (this.isEmpty())
			return undefined;
			
		return {
			left: this.upperLeft!.x,
			top: this.upperLeft!.y,
			right: this.lowerRight!.x,
			bottom: this.lowerRight!.y
		};
	}

	/** gets the upper left point of the bounding rectangle, or undefined if empty */
	getUpperLeft() : Point | undefined
	{
		if (this.isEmpty())
			return undefined;

		const {x,y} = this.upperLeft!;
		return {x,y}; // copy so it can't be modifed by caller
	}

	/** gets the lower right point of the bounding rectangle, or undefined if empty */
	getLowerRight() : Point | undefined
	{
		if (this.isEmpty())
			return undefined;

		const {x,y} = this.lowerRight!;
		return {x,y}; // copy so it can't be modifed by caller
	}
}
