import axios from 'axios'

export default class AxiosWrapper {
	static async post(url, data, config) {
		const res = await axios.post(url, data, config)
		return res.data
	}
	static async get(url, config) {
		const res = await axios.get(url, config)
		return res.data
	}
}
