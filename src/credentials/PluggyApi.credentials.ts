import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class PluggyApi implements ICredentialType {
	name = 'pluggyApi';
	displayName = 'Pluggy API';
	documentationUrl = 'https://docs.pluggy.ai';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Sua chave de API da Pluggy. Obtenha em https://dashboard.pluggy.ai',
		},
	];
}
