import axios from 'axios'

/** URL do servidor da API, diferente para o sapper e o browser */
export const apiServerUrl = typeof window == 'undefined'
	? '__INTERNAL_API_URL__'
	: '__PUBLIC_API_URL__'

export default axios.create({
	baseURL: apiServerUrl,
	withCredentials: true
})
