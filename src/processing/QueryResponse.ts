export interface QueryResponseColumn {
	type: string;
	text: string;
};

export interface QueryResponse {
	columns: QueryResponseColumn[];
	rows: any[];
};