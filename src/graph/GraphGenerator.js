import _ from 'lodash';
import { has, find } from 'lodash';

class GraphGenerator {

	constructor(panelController, inputData) {
		this.data = inputData;
		this.panelCtrl = panelController;
	}

	generateGraph() {
		//TODO ensure that data has correct format => data processor
		const { data } = this;

		var nodes = this.getNodes();
		var connections = this.getConnections();

		var graph = {
			renderer: "region",
			name: "INTERNET",
			displayName: "INTERNET",
			nodes: nodes,
			layout: this.panelCtrl.panel.sdgSettings.layout,
			metadata: {},
			class: "normal",
			maxVolume: this.panelCtrl.panel.sdgSettings.maxVolume,
			connections: connections,
			layoutOptions: {
				noRankPromotion: true,
				pullUpLeaves: true,
				adjustWidthToRanks: true
			}
		};

		return graph;
	}

	getNodes() {
		var that = this;

		var nodes = _(this.data.data)
			.flatMap(d => {
				// filter external
				if (_.has(d, 'data.external')) {
					if (d.data.external === 'source') {
						return [d.target];
					} else {
						return [d.source];
					}
				} else {
					return [d.source, d.target];
				}
			})
			.uniq()
			.filter()
			.map(nodeName => {
				var requestCount = _.defaultTo(
					_(this.data.data)
						.filter(d => d.source !== d.target)
						.filter({
							'target': nodeName
						})
						.map(n => n.data.rate)
						.sum(), 0);

				var errorCount = _.defaultTo(
					_(this.data.data)
						.filter(d => d.source !== d.target)
						.filter({
							'target': nodeName
						})
						.filter(d => _.has(d.data, 'err_rate'))
						.map(n => n.data.err_rate)
						.sum(), -1);

				var responseTime = _.defaultTo(
					_(this.data.data)
						.filter(d => d.source !== d.target)
						.filter({
							'target': nodeName
						})
						.map(n => n.data.res_time_sum)
						.sum(), -1);

				if (this.panelCtrl.panel.sdgSettings.sumTimings && responseTime >= 0) {
					responseTime = responseTime / (requestCount + errorCount);
				}

				var healthyPct = 1.0 / (requestCount + errorCount) * requestCount;
				var errorPct = 1.0 / (requestCount + errorCount) * errorCount;

				if (!healthyPct || !errorPct) {
					healthyPct = 1.0;
					errorPct = 0.0;
				}

				var aggregationType = this.getTemplateVariable('aggregationType');
				var componentMapping = _.filter(this.data.componentMapping, c => c[aggregationType] == nodeName);

				// // TODO cleanup
				// var centerData = {};
				// if (aggregationType == 'app') {
				// 	centerData.value = _(componentMapping)
				// 		.map(c => c.service)
				// 		.uniq()
				// 		.value()
				// 		.length;
				// 	centerData.text = 'Service' + (centerData.value > 1 ? 's' : '');
				// }
				// else if (aggregationType == 'service') {
				// 	centerData.value = _(componentMapping)
				// 		.map(c => c.node)
				// 		.uniq()
				// 		.value()
				// 		.length;
				// 	centerData.text = 'Instance' + (centerData.value > 1 ? 's' : '');
				// }
				// else {
				// 	centerData = null
				// }

				return {
					name: nodeName,
					metrics: {
						requestCount: requestCount,
						errorCount: errorCount,
						responseTime: responseTime
					},
					donutMetrics: {
						healthyPct: healthyPct,
						errorPct: errorPct
					},
					metadata: {
						componentMapping: componentMapping,
						aggregation: aggregationType,
						centerData: null
					},
					nodeView: 'focused'
				};
			})
			.value();

		var entryNodes = _(this.data.data)
			.filter(d => !d.source && d.target)
			.map(d => d.target)
			.uniq()
			.map(nodeName => {
				return {
					name: '__ENTRY__', // + nodeName,
					nodeView: 'symbol',
					symbol: this.getTypeSymbol('web'),
					hideName: true
				};
			})
			.value();

		var externalNodes = _(this.data.data)
			.map(d => {
				// filter external
				if (_.has(d, 'data.external')) {
					if (d.data.external === 'source') {
						return d.source;
					} else {
						return d.target;
					}
				} else {
					return null;
				}
			})
			.uniq()
			.filter()
			.map(target => {
				var sample = _.find(this.data.data, d => {
					return d.target === target || d.source === target;
				});

				var callCount = _.defaultTo(
					_(this.data.data)
						.filter({
							target: target
						})
						.map(o => o.data.rate_out)
						.sum()
					, 0);

				var responseTime = _.defaultTo(
					_(this.data.data)
						.filter({
							target: target
						})
						.map(o => o.data.res_time_sum_out)
						.sum()
					, -1);

				if (this.panelCtrl.panel.sdgSettings.sumTimings && responseTime >= 0) {
					responseTime = responseTime / callCount;
				}

				return {
					name: target,
					metrics: {
						requestCount: callCount,
						responseTime: responseTime
					},
					metadata: {
						external_type: sample.data.type
					},
					nodeView: 'symbol',
					symbol: this.getTypeSymbol(sample.data.type)
				};
			})
			.value();

		return _.concat(nodes, entryNodes, externalNodes);
	}

	getConnections() {
		var that = this;
		// for now -  filter incomplete connections

		var connections = _(this.data.data)
			.filter(e => e.source && e.target)
			.filter(e => e.source !== e.target) // no self calls
			.map(obj => {
				var connectionTime;
				var errorRate;
				var requestRate;

				if (obj.data) {
					errorRate = _.defaultTo(obj.data.err_rate_out, -1);

					if (obj.data.external && obj.data.external === "target") {
						requestRate = _.defaultTo(obj.data.rate_out, -1);
					} else {
						requestRate = _.defaultTo(obj.data.rate || obj.data.rate_out, -1);
					}

					if (this.panelCtrl.panel.sdgSettings.sumTimings && requestRate >= 0) {
						connectionTime = _.defaultTo((obj.data.res_time_sum_out / obj.data.rate_out) - (obj.data.res_time_sum / obj.data.rate), -1);
					} else {
						connectionTime = _.defaultTo(obj.data.res_time_sum_out - obj.data.res_time_sum, -1);
					}
				}

				return {
					source: obj.source,
					target: obj.target,
					metrics: {
						normal: requestRate,
						danger: errorRate
					},
					metadata: {
						connectionTime: connectionTime
					},
					updated: Date.now()
				};
			})
			.value();

		var entryConnections = _(this.data.data)
			.filter(e => !e.source && e.target)
			.map(obj => {
				var requestRate;

				if (obj.data) {
					requestRate = _.defaultTo(obj.data.rate, 0);
				}

				return {
					source: '__ENTRY__', // + obj.target,
					target: obj.target,
					metrics: {
						normal: requestRate
					},
					updated: Date.now()
				};
			})
			.value();

		var allConnections = _.concat(connections, entryConnections);

		_.each(allConnections, c => {
			if (!_.has(c, 'metadata')) {
				c['metadata'] = {};
			}
			c.metadata['showStats'] = this.panelCtrl.panel.sdgSettings.showConnectionStats;
		});

		return allConnections;
	}

	getTypeSymbol(type) {
		const mapping = find(this.panelCtrl.panel.sdgSettings.externalIcons, e => e.type.toLowerCase() === type.toLowerCase());

		// debugger;

		// const typeLC = type.toLowerCase();
		// const iconMap = {
		// 	'database': 'database.png',
		// 	'jms': 'message.png',
		// 	'web': 'web.png',
		// 	'http': 'http.png'
		// };

		if (mapping !== undefined) {
			return this.getAssetUrl(mapping.icon + '.png');
		} else {
			return this.getAssetUrl('default.png');
		}
	}

	getAssetUrl(assetName) {
		var baseUrl = 'public/plugins/' + this.panelCtrl.panel.type;

		return baseUrl + '/assets/' + assetName;
	}

	getTemplateVariable(name) {
		return _.find(this.panelCtrl.dashboard.templating.list, {
			name: name
		}).current.value;
	}
}

export default GraphGenerator;