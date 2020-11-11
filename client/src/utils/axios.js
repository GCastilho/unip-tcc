import axios from 'axios'

/** URL do servidor da API, diferente para o sapper e o browser */
export const apiServerUrl = typeof window == 'undefined'
	? '__API_URL__'
	: `http://${window.location.hostname}:__API_PORT__`

export default axios.create({
	baseURL: apiServerUrl,
	withCredentials: true
})
