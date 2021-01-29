export class Rational {
	numerator: bigint;
	divisor: bigint;
	constructor(numerator: number = 0, divisor: number = 1) {
		this.numerator = BigInt(numerator);
		this.divisor = BigInt(divisor);
	}
	add(addend: Rational) {
		this.numerator = this.numerator * addend.divisor + this.divisor * addend.numerator;
		this.divisor *= addend.divisor;
	}
	multiply(factor: Rational) {
		this.numerator *= factor.numerator;
		this.divisor *= factor.divisor;
	}
	divide(divisor: Rational) {
		this.numerator *= divisor.divisor;
		this.divisor *= divisor.numerator;
	}
	getNumber() : number {
		function gcd(a: bigint, b: bigint) : bigint {return !b ? a : gcd(b, a % b);}
		const commonDivisor = gcd(this.numerator, this.divisor);
		return Number(this.numerator / commonDivisor) / Number(this.divisor / commonDivisor);
	}
}
