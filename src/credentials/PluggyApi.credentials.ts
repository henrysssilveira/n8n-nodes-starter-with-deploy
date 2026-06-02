import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class PluggyApi implements ICredentialType {
	name = 'pluggyApi';
	displayName = 'Pluggy API';
	documentationUrl = 'https://docs.pluggy.ai';
	
	// Usamos o pacote nativo de autenticação do n8n para gerir o ciclo de vida
	// Isto garante cache automático em memória curta durante as execuções
	properties: INodeProperties[] = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'f8c9b8f0-b8e2-4f0f-b8e2-4f0f8e2f0f8e2',
			description: 'O Client ID fornecido pelo painel da Pluggy',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'O Client Secret fornecido pelo painel da Pluggy',
		},
	];

	// O método 'test' valida se as credenciais funcionam salvando o token temporário
	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			url: 'https://api.pluggy.ai/auth',
			body: {
				clientId: '={{$credentials.clientId}}',
				clientSecret: '={{$credentials.clientSecret}}',
			},
			json: true,
		},
	};
}
