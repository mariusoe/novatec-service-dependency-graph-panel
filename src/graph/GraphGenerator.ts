import _, { groupBy, filter, map, sum, some, isUndefined } from 'lodash';
import { GraphData, GraphDataElement, GraphDataType } from './GraphData';
import { isPresent } from '../util/Utils';
import {IGraph, IGraphEdge, IGraphMetrics, IGraphNode, EGraphNodeType} from './Graph';

class GraphGenerator {

	controller: any;

	constructor(panelController) {
		this.controller = panelController;
	}

	_createNode(dataElements: GraphDataElement[]): IGraphNode | undefined {
		if (!dataElements || dataElements.length <= 0) {
			return undefined;
		}

		const nodeName = dataElements[0].target;
		const internalNode = some(dataElements, ['type', GraphDataType.INTERNAL]) || some(dataElements, ['type', GraphDataType.EXTERNAL_IN]);
		const nodeType = internalNode ? EGraphNodeType.INTERNAL : EGraphNodeType.EXTERNAL;

		const metrics: IGraphMetrics = {};

		const node: IGraphNode = {
			name: nodeName,
			type: nodeType,
			metrics
		};

		if (internalNode) {
			metrics.rate = sum(map(dataElements, element => element.data.rate_in));
			metrics.error_rate = sum(map(dataElements, element => element.data.error_rate_in));
			metrics.response_time = sum(map(dataElements, element => element.data.response_time_in));
		} else {
			metrics.rate = sum(map(dataElements, element => element.data.rate_out));
			metrics.error_rate = sum(map(dataElements, element => element.data.error_rate_out));
			metrics.response_time = sum(map(dataElements, element => element.data.response_time_out));

			const externalType = _(dataElements)
				.map(element => element.data.type)
				.uniq()
				.value();
			if (externalType.length == 1) {
				node.external_type = externalType[0];
			}
		}

		const { rate, error_rate } = metrics;
		if (rate + error_rate > 0) {
			metrics.success_rate = 1.0 / (rate + error_rate) * rate;
		} else {
			metrics.success_rate = 1.0;
		}

		return node;
	}

	_createNodes(data: GraphDataElement[]): IGraphNode[] {
		const filteredData = filter(data, dataElement => dataElement.source !== dataElement.target);

		const targetGroups = groupBy(filteredData, 'target');

		const nodes = map(targetGroups, group => this._createNode(group));
		return nodes.filter(isPresent);
	}

	_createEdge(dataElement: GraphDataElement): IGraphEdge | undefined {
		const { source, target } = dataElement;

		if (source === undefined || target === undefined) {
			console.error("source and target are necessary to create an edge", dataElement);
			return undefined;
		}

		const metrics: IGraphMetrics = {};

		const edge: IGraphEdge = {
			source,
			target,
			metrics
		};

		const { rate_out, error_rate_out, response_time_out } = dataElement.data;

		if (!isUndefined(rate_out)) {
			metrics.rate = rate_out;
		}
		if (!isUndefined(error_rate_out)) {
			metrics.error_rate = error_rate_out;
		}
		if (!isUndefined(response_time_out)) {
			metrics.response_time = response_time_out;
		}

		return edge;
	}

	_createEdges(data: GraphDataElement[]): IGraphEdge[] {

		const filteredData = _(data)
			.filter(e => !!e.source)
			.filter(e => e.source !== e.target)
			.value();

		const edges = map(filteredData, element => this._createEdge(element));
		return edges.filter(isPresent);
	}

	generateGraph(graphData: GraphDataElement[]) : IGraph {
		const nodes = this._createNodes(graphData);
		const edges = this._createEdges(graphData);

		console.groupCollapsed('Graph generated');
		console.log('Input data:', graphData);
		console.log('Nodes:', nodes);
		console.log('Edges:', edges);
		console.groupEnd();

		const graph : IGraph = {
			nodes,
			edges
		};

		return graph;
	}
}

export default GraphGenerator;