import axios from 'axios'

export default class AxiosWrapper {
	static async post(url, data, config) {
		const res = await axios.post(url, data, config)
		return res.data
	}
}