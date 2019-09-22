const normalizedPath = require("path").join(__dirname)

const currencies = {}

require('fs').readdirSync(normalizedPath)
.forEach(filename =>
	filename !== 'index.js' &&
	(currencies[filename.replace('.js', '')] = require(`./${filename}`))
)

module.exports = currencies
