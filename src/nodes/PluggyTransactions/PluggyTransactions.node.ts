import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	IDataObject,
	NodeOperationError,
} from 'n8n-workflow';

export class PluggyTransactions implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pluggy Transactions',
		name: 'pluggyTransactions',
		icon: 'file:pluggy.svg',
		group: ['transform'],
		version: 1,
		description: 'Lista transações financeiras de uma conta via Pluggy API (cursor-based pagination)',
		defaults: { name: 'Pluggy Transactions' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'pluggyApi', required: true }],
		properties: [
			{
				displayName: 'Account ID',
				name: 'accountId',
				type: 'string',
				required: true,
				default: '',
				placeholder: '562b795d-1653-429f-be86-74ead9502813',
				description: 'UUID da conta cujas transações serão recuperadas',
			},
			{
				displayName: 'Buscar Todas as Páginas',
				name: 'fetchAllPages',
				type: 'boolean',
				default: true,
				description: 'Se ativado, percorre todas as páginas automaticamente usando o cursor',
			},
			{
				displayName: 'Cursor (after)',
				name: 'after',
				type: 'string',
				default: '',
				placeholder: 'MjAyMC0xMC0xNVQwMDow...',
				description: 'Cursor para buscar a próxima página. Obtido do campo "next" da resposta anterior.',
				displayOptions: { show: { fetchAllPages: [false] } },
			},
			{
				displayName: 'Filtros',
				name: 'filters',
				type: 'collection',
				placeholder: 'Adicionar Filtro',
				default: {},
				options: [
					{
						displayName: 'IDs de Transações',
						name: 'ids',
						type: 'string',
						default: '',
						placeholder: 'uuid1, uuid2, uuid3',
						description: 'Lista de UUIDs separados por vírgula. Máximo de 500 IDs.',
					},
					{
						displayName: 'Data Inicial (dateFrom)',
						name: 'dateFrom',
						type: 'string',
						default: '',
						placeholder: '2020-10-13',
						description: 'Filtrar transações com data maior ou igual. Formato: yyyy-mm-dd. Não pode ser usado junto com createdAtFrom.',
					},
					{
						displayName: 'Data Final (dateTo)',
						name: 'dateTo',
						type: 'string',
						default: '',
						placeholder: '2020-10-15',
						description: 'Filtrar transações com data menor ou igual. Formato: yyyy-mm-dd.',
					},
					{
						displayName: 'Criado a partir de (createdAtFrom)',
						name: 'createdAtFrom',
						type: 'string',
						default: '',
						placeholder: '2020-10-13T03:00:00.000Z',
						description: 'Filtrar transações criadas após esta data. Formato: yyyy-mm-ddThh:mm:ss.000Z. Não pode ser usado junto com dateFrom.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const allTransactions: INodeExecutionData[] = [];

		// ── Auth — executa UMA vez para toda a execução do node ──────────────
		const credentials = await this.getCredentials('pluggyApi');
		const clientId = credentials.clientId as string;
		const clientSecret = credentials.clientSecret as string;

		if (!clientId || !clientSecret) {
			throw new NodeOperationError(
				this.getNode(),
				'Client ID e Client Secret são obrigatórios nas credenciais.',
			);
		}

		let apiKey: string;
		try {
			const authResponse = await this.helpers.httpRequest({
				method: 'POST',
				url: 'https://api.pluggy.ai/auth',
				body: { clientId, clientSecret },
				json: true,
			} as IHttpRequestOptions);
			apiKey = authResponse.apiKey as string;
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Falha na autenticação com a Pluggy: ${(error as Error).message}`,
			);
		}
		// ─────────────────────────────────────────────────────────────────────

		for (let i = 0; i < items.length; i++) {
			const accountId = this.getNodeParameter('accountId', i) as string;
			const fetchAllPages = this.getNodeParameter('fetchAllPages', i) as boolean;
			const filters = this.getNodeParameter('filters', i, {}) as {
				ids?: string;
				dateFrom?: string;
				dateTo?: string;
				createdAtFrom?: string;
			};

			if (!accountId) {
				throw new NodeOperationError(
					this.getNode(),
					'Account ID é obrigatório.',
					{ itemIndex: i },
				);
			}

			if (filters.dateFrom && filters.createdAtFrom) {
				throw new NodeOperationError(
					this.getNode(),
					'dateFrom e createdAtFrom não podem ser usados juntos.',
					{ itemIndex: i },
				);
			}

			const baseParams: Record<string, string> = { accountId };
			if (filters.ids) baseParams.ids = filters.ids;
			if (filters.dateFrom) baseParams.dateFrom = filters.dateFrom;
			if (filters.dateTo) baseParams.dateTo = filters.dateTo;
			if (filters.createdAtFrom) baseParams.createdAtFrom = filters.createdAtFrom;

			let cursor: string | null = null;
			if (!fetchAllPages) {
				const manualCursor = this.getNodeParameter('after', i, '') as string;
				if (manualCursor) cursor = manualCursor;
			}

			do {
				const qs: Record<string, string> = { ...baseParams };
				if (cursor) qs.after = cursor;

				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: 'https://api.pluggy.ai/v2/transactions',
					headers: {
						'X-API-KEY': apiKey,
						'Content-Type': 'application/json',
					},
					qs,
					json: true,
				} as IHttpRequestOptions);

				const results: IDataObject[] = response.results ?? [];
				for (const transaction of results) {
					allTransactions.push({ json: transaction });
				}

				if (response.next) {
					const nextUrl = new URL(`https://api.pluggy.ai${response.next}`);
					cursor = nextUrl.searchParams.get('after');
				} else {
					cursor = null;
				}
			} while (fetchAllPages && cursor !== null);
		}

		return [allTransactions];
	}
}
