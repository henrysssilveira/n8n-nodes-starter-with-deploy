import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class PluggyApi implements ICredentialType {
	name = 'pluggyApi';
	displayName = 'Pluggy API';
	documentationUrl = 'https://docs.pluggy.ai';

	properties: INodeProperties[] = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'f8c9b8f0-b8e2-4f0f-b8e2-4f0f8e2f0f8e2',
			description: 'Client ID do painel da Pluggy',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Client Secret do painel da Pluggy',
		},
	];

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
