import axios from 'axios'

const port = process.env.NODE_ENV === 'development' ? 3001 : 3000

export default axios.create({
	baseURL: `http://api.localhost:${port}`,
	withCredentials: true
})
