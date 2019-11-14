import mongoose, { Mongoose } from 'mongoose'
const mongodb_url = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017'
const db = mongoose.connection

/**
 * Retorna uma promessa ao se conectar com o database
 */
export function init(database: string): Promise<Mongoose> {
	return new Promise((resolve, reject) => {
		if (!database) reject('database needs to be informed')
		process.stdout.write('Connecting to mongodb... ')

		mongoose.connect(`${mongodb_url}/${database}`, {
			user: process.env.MONGODB_USER,
			pass: process.env.MONGODB_PASS,
			useNewUrlParser: true,
			useCreateIndex: true,
			useUnifiedTopology: true
		})

		db.on('connected', () => {
			console.log('Connected')
			resolve(mongoose)
		})

		db.on('error', (err) => {
			console.error('Database connection error:', err)
			process.exit(1)
		})
	})
}

/**
 * Exporta o mongoose diretamente
 */
export { default as mongoose, Mongoose } from 'mongoose'