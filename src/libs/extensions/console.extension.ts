import log from 'loglevel'

let log_level: keyof log.LogLevel

switch (process.env.NODE_ENV) {
	// case('production'):
	case('test'):
		log_level = 'WARN'
		break
	default:
		log_level = 'TRACE'
		break
}

log.setLevel(log_level)

console.trace = log.trace
console.log = log.debug
console.debug = log.debug
console.info = log.info
console.warn = log.warn
console.error = log.error
