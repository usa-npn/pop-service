"use strict";
function getNpnPortalParams(req) {
    let params = {
        request_src: 'dot_service',
        downloadType: req.body.downloadType,
        start_date: req.body.startDate,
        end_date: req.body.endDate,
        num_days_quality_filter: req.body.num_days_quality_filter,
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
        integrated_datasets: req.body.integrated_datasets,
        dataset_ids: req.body.dataset_ids,
        ancillary_data: req.body.ancillary_data
    };
    return params;
}
exports.getNpnPortalParams = getNpnPortalParams;
exports.paramNamesBeautified = {
    request_src: 'Request Source:',
    downloadType: 'Data Type:',
    start_date: 'Start Date:',
    end_date: 'End Date:',
    num_days_quality_filter: 'Data Precision Filter:',
    state: 'States:',
    bottom_left_constraint: 'Coordinates, Bottom-Left Constraint:',
    upper_right_constraint: 'Coordinates, Upper-Right Constraint:',
    species_names: 'Species:',
    phenophase_category: 'Phenophase Categories:',
    additionalFieldDisplay: 'Output Fields:',
    qualityFlags: 'Quality Flags:',
    network: 'Partner Groups:',
    integrated_datasets: 'Integrated Datasets:'
};
//# sourceMappingURL=npnPortalParams.js.map