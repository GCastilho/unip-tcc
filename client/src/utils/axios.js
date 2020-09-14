import axios from 'axios'

/** URL do servidor da API, diferente para o sapper e o browser */
export const apiServerUrl = typeof window == 'undefined' ?
	'http://localhost:3000' :
	`http://${window.location.hostname}:3001`

export default axios.create({
	baseURL: apiServerUrl,
	withCredentials: true
})
