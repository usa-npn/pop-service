export interface NpnPortalParams {
    request_src: string;
    downloadType: string;
    person_id: number;
    start_date: string;
    end_date: string;
    num_days_quality_filter: number;
    frequency: number;
    state: string[];
    bottom_left_x1: number;
    bottom_left_y1: number;
    upper_right_x2: number;
    upper_right_y2: number;
    bottom_left_constraint: string;
    upper_right_constraint: string;
    species_id: string[];
    species_names: string[];
    phenophase_category: string[];
    additional_field: string[];
    additionalFieldDisplay: string[];
    qualityFlags: string;
    network: string[];
    network_id : number;
    integrated_datasets: string[];
    dataset_ids: string[];
    ancillary_data: string[];
    station_id: string[];
    [s: string]: (string | number | string[]);
}

export function getNpnPortalParams(req: any): NpnPortalParams {
    let params: NpnPortalParams = {
        request_src: "dot_service",
        downloadType: req.body.downloadType,
        person_id: req.body.observerId,
        start_date: req.body.startDate,
        end_date: req.body.endDate,
        num_days_quality_filter: req.body.num_days_quality_filter,
        frequency: req.body.frequency,
        state: req.body.state,
        bottom_left_x1: req.body.bottom_left_x1,
        bottom_left_y1: req.body.bottom_left_y1,
        upper_right_x2: req.body.upper_right_x2,
        upper_right_y2: req.body.upper_right_y2,
        bottom_left_constraint: req.body.bottom_left_constraint,
        upper_right_constraint: req.body.upper_right_constraint,
        species_id: req.body.species_ids,
        species_names: req.body.species_names,
        phenophase_category: req.body.phenophaseCategories,
        additional_field: req.body.additionalFields,
        additionalFieldDisplay: req.body.additionalFieldsDisplay,
        qualityFlags: req.body.qualityFlags,
        network: req.body.partnerGroups,
        network_id: req.body.network_ids,
        integrated_datasets: req.body.integrated_datasets,
        dataset_ids: req.body.dataset_ids,
        ancillary_data: req.body.ancillary_data,
        station_id: req.body.stations
    };

    return params;
}

interface ParamNamesBeautified {
    [key: string]: string;
}

export var paramNamesBeautified: ParamNamesBeautified = {
    request_src: "Request Source:",
    downloadType: "Data Type:",
    observerId: "Observer ID:",
    person_id: "Observer ID:",
    start_date: "Start Date:",
    end_date: "End Date:",
    num_days_quality_filter: "Data Precision Filter:",
    frequency: "Period of Interest:",
    state: "States:",
    bottom_left_constraint: "Coordinates, Bottom-Left Constraint:",
    upper_right_constraint: "Coordinates, Upper-Right Constraint:",
    species_names: "Species:",
    phenophase_category: "Phenophase Categories:",
    additionalFieldDisplay: "Output Fields:",
    qualityFlags: "Quality Flags:",
    network: "Partner Groups:",
    integrated_datasets: "Integrated Datasets:",
    station_id: "Stations:"
};