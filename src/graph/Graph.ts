export interface IGraph {
	nodes: IGraphNode[],
	edges: IGraphEdge[]
};

export interface IGraphNode {
	name: string;
	type: EGraphNodeType;
	metrics?: IGraphMetrics;
	external_type?: string;
};

export interface IGraphMetrics {
	rate?: number;
	error_rate?: number;
	response_time?: number;
	success_rate?: number;
};

export enum EGraphNodeType {
	INTERNAL = 'INTERNAL',
	EXTERNAL = 'EXTERNAL'
};

export interface IGraphEdge {
	source: string;
	target: string;
	metrics?: IGraphMetrics;
};