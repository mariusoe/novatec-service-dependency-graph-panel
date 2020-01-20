import { QueryResponse } from '../processing/QueryResponse';

export interface DataElement {
    rate_in?: number;
    rate_out?: number;
    response_time_in?: number;
    response_time_out?: number;
    error_rate_in?: number;
    error_rate_out?: number;
    type?: string;
};

export interface GraphDataElement {
    source?: string;
    target: string;
    data: DataElement;
    type: GraphDataType;
};

export enum GraphDataType {
    SELF = 'SELF',
    INTERNAL = 'INTERNAL',
    EXTERNAL_OUT = 'EXTERNAL_OUT',
    EXTERNAL_IN = 'EXTERNAL_IN'
};

export interface GraphData {
    data: GraphDataElement[];
    rawData: QueryResponse[];
};