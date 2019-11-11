import Common from '../index'

export function teste(this: Common) {
	console.log('name:', this.name, this.code)
}
