import { writable } from 'svelte/store'

const transactionsList = writable([])

export { transactionsList }
