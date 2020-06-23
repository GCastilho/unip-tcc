import axios from 'axios'

export default axios.create({
	baseURL: 'http://api.localhost:3001',
	withCredentials: true
})
